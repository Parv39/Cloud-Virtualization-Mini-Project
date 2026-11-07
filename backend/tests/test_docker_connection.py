import docker
import sys

def test_docker_sdk():
    print("Testing Docker SDK connection...")
    try:
        client = docker.from_env()
        ping_ok = client.ping()
        print(f"Docker ping: {ping_ok}")
        version_info = client.version()
        print(f"Engine Version: {version_info.get('Version')}")
        print(f"API Version: {version_info.get('ApiVersion')}")
        print(f"OS/Arch: {version_info.get('Os')}/{version_info.get('Arch')}")
        
        images = client.images.list()
        print(f"Discovered {len(images)} existing image(s):")
        for img in images:
            print(f" - Tags: {img.tags}, ID: {img.short_id}")
            
        containers = client.containers.list(all=True)
        print(f"Discovered {len(containers)} existing container(s):")
        for c in containers:
            print(f" - Name: {c.name}, Status: {c.status}, ID: {c.short_id}")
            
        return True
    except Exception as e:
        print(f"Docker SDK connection failed: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = test_docker_sdk()
    sys.exit(0 if success else 1)
