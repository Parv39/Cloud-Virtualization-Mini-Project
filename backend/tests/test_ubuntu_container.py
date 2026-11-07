import docker
import time
import sys

def verify_ubuntu_container():
    client = docker.from_env()
    container_name = "dvem-test-ubuntu"
    
    # Ensure no leftover container from previous test
    try:
        old = client.containers.get(container_name)
        print(f"Removing old test container {container_name}...")
        old.remove(force=True)
    except docker.errors.NotFound:
        pass

    print(f"Creating real Ubuntu container: {container_name} with resource limits (512MB RAM, 0.5 CPU)...")
    container = client.containers.run(
        image="ubuntu:22.04",
        name=container_name,
        command="tail -f /dev/null",
        detach=True,
        mem_limit="512m",
        nano_cpus=500_000_000, # 0.5 CPU
        network_mode="bridge",
        privileged=False,
        labels={"managed_by": "DVEM", "environment_type": "ubuntu"}
    )
    
    try:
        print(f"Container created successfully!")
        print(f" - Container ID: {container.id}")
        print(f" - Container Name: {container.name}")
        print(f" - Status: {container.status}")
        
        # Give container a moment to be running
        time.sleep(1)
        container.reload()
        print(f" - Active Status: {container.status}")
        assert container.status == "running", f"Container status is {container.status}, expected running"
        
        # Test 1: OS Release and Kernel
        print("\n[Executing in Container]: uname -a")
        res1 = container.exec_run("uname -a")
        print(f"Exit code: {res1.exit_code}")
        print(f"Output:\n{res1.output.decode('utf-8').strip()}")
        assert res1.exit_code == 0
        
        print("\n[Executing in Container]: cat /etc/os-release")
        res2 = container.exec_run("cat /etc/os-release")
        print(f"Exit code: {res2.exit_code}")
        print(f"Output:\n{res2.output.decode('utf-8').strip()}")
        assert res2.exit_code == 0
        assert "Ubuntu" in res2.output.decode("utf-8")
        
        # Test 2: File Creation inside container
        print("\n[Executing in Container]: mkdir /MCA_Project && echo 'Hello DVEM Virtualization' > /MCA_Project/demo.txt && cat /MCA_Project/demo.txt")
        res3 = container.exec_run("bash -c 'mkdir -p /MCA_Project && echo \"Hello DVEM Virtualization\" > /MCA_Project/demo.txt && cat /MCA_Project/demo.txt'")
        print(f"Exit code: {res3.exit_code}")
        print(f"Output:\n{res3.output.decode('utf-8').strip()}")
        assert res3.exit_code == 0
        assert "Hello DVEM Virtualization" in res3.output.decode("utf-8")
        
        # Test 3: Resource monitoring verification
        print("\n[Container Resource Inspection]:")
        stats = container.stats(stream=False)
        memory_usage = stats.get("memory_stats", {}).get("usage", 0)
        memory_limit = stats.get("memory_stats", {}).get("limit", 0)
        print(f"Memory Usage: {memory_usage / (1024*1024):.2f} MB")
        print(f"Memory Limit: {memory_limit / (1024*1024):.2f} MB")
        # 512 MB = 536870912 bytes
        assert memory_limit == 536870912, f"Memory limit mismatch: {memory_limit}"
        print("Resource constraints successfully verified!")
        
        print("\nAll integration verification tests PASSED!")
        return True
    finally:
        print(f"\nCleaning up test container {container_name}...")
        try:
            container.remove(force=True)
            print("Test container removed cleanly.")
        except Exception as e:
            print(f"Failed to remove container: {e}")

if __name__ == "__main__":
    success = verify_ubuntu_container()
    sys.exit(0 if success else 1)
