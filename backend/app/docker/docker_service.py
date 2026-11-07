import os
import tarfile
import io
import json
import logging
from typing import Optional, List, Dict, Any, Tuple
import docker
from docker.errors import DockerException, NotFound, APIError
from backend.app.core.config import settings

logger = logging.getLogger("dvem.docker_service")

# Predefined templates
TEMPLATES = {
    "ubuntu": {
        "name": "Ubuntu Linux",
        "image": "ubuntu:22.04",
        "shell": "/bin/bash",
        "description": "Full-featured Ubuntu 22.04 LTS environment with standard Linux utilities and APT package manager."
    },
    "python": {
        "name": "Python Development",
        "image": "python:3.11-slim",
        "shell": "/bin/bash",
        "description": "Python 3.11 runtime environment with pip package manager preinstalled."
    },
    "nodejs": {
        "name": "Node.js Development",
        "image": "node:20-slim",
        "shell": "/bin/bash",
        "description": "Node.js 20 LTS runtime environment with npm package manager preinstalled."
    },
    "alpine": {
        "name": "Lightweight Alpine Linux",
        "image": "alpine:latest",
        "shell": "/bin/sh",
        "description": "Extremely lightweight Alpine Linux environment (~5MB) with apk package manager."
    }
}

class DockerService:
    def __init__(self):
        self._client: Optional[docker.DockerClient] = None

    def get_client(self) -> docker.DockerClient:
        if self._client is None:
            try:
                self._client = docker.from_env()
                self._client.ping()
            except Exception as e:
                logger.error(f"Failed to connect to Docker daemon: {e}")
                raise RuntimeError(f"Could not connect to existing Docker Desktop Engine: {e}")
        return self._client

    def ping(self) -> bool:
        try:
            return self.get_client().ping()
        except Exception:
            return False

    def get_system_info(self) -> Dict[str, Any]:
        client = self.get_client()
        info = client.info()
        version = client.version()
        return {
            "version": version.get("Version", "Unknown"),
            "api_version": version.get("ApiVersion", "Unknown"),
            "os": info.get("OperatingSystem", "Unknown"),
            "arch": info.get("Architecture", "Unknown"),
            "cpus": info.get("NCPU", 0),
            "total_memory_bytes": info.get("MemTotal", 0),
            "storage_driver": info.get("Driver", "Unknown"),
            "containers_total": info.get("Containers", 0),
            "containers_running": info.get("ContainersRunning", 0),
            "containers_stopped": info.get("ContainersStopped", 0),
            "images_count": info.get("Images", 0)
        }

    # --- Container Lifecycle Operations ---

    def create_container(
        self,
        name: str,
        image: str,
        cpu_limit: float = 0.5,
        ram_limit_mb: int = 512,
        volume_name: Optional[str] = None,
        volume_mount_path: Optional[str] = "/data",
        network_name: Optional[str] = "bridge",
        labels: Optional[Dict[str, str]] = None
    ) -> Any:
        client = self.get_client()

        # Build labels
        container_labels = {
            settings.DOCKER_MANAGED_LABEL_KEY: settings.DOCKER_MANAGED_LABEL_VALUE,
            "environment_name": name
        }
        if labels:
            container_labels.update(labels)

        # Build volume mounts if specified
        volumes = {}
        if volume_name:
            # Safe named volume mounting ONLY
            volumes[volume_name] = {"bind": volume_mount_path or "/data", "mode": "rw"}

        # Calculate resource constraints
        mem_limit_bytes = int(ram_limit_mb * 1024 * 1024)
        nano_cpus = int(cpu_limit * 1_000_000_000)

        # Safe container launch: non-privileged, isolated network, keepalive command
        container = client.containers.run(
            image=image,
            name=name,
            command="tail -f /dev/null",
            detach=True,
            mem_limit=mem_limit_bytes,
            nano_cpus=nano_cpus,
            volumes=volumes,
            network=network_name or "bridge",
            privileged=False,
            labels=container_labels,
            stdin_open=True,
            tty=True
        )
        return container

    def get_container(self, container_id: str) -> Any:
        client = self.get_client()
        try:
            container = client.containers.get(container_id)
            # Verify ownership to protect unrelated containers
            if container.labels.get(settings.DOCKER_MANAGED_LABEL_KEY) != settings.DOCKER_MANAGED_LABEL_VALUE:
                raise PermissionError("Access denied: Target container is not managed by DVEM.")
            return container
        except NotFound:
            return None

    def start_container(self, container_id: str):
        container = self.get_container(container_id)
        if container:
            container.start()

    def stop_container(self, container_id: str, timeout: int = 5):
        container = self.get_container(container_id)
        if container:
            container.stop(timeout=timeout)

    def restart_container(self, container_id: str, timeout: int = 5):
        container = self.get_container(container_id)
        if container:
            container.restart(timeout=timeout)

    def pause_container(self, container_id: str):
        container = self.get_container(container_id)
        if container:
            container.pause()

    def unpause_container(self, container_id: str):
        container = self.get_container(container_id)
        if container:
            container.unpause()

    def delete_container(self, container_id: str, force: bool = True):
        container = self.get_container(container_id)
        if container:
            container.remove(force=force)

    def get_container_logs(self, container_id: str, tail: int = 200) -> str:
        container = self.get_container(container_id)
        if not container:
            return ""
        try:
            logs = container.logs(tail=tail, stderr=True, stdout=True)
            return logs.decode("utf-8", errors="replace")
        except Exception as e:
            return f"Error retrieving logs: {e}"

    def get_container_stats(self, container_id: str) -> Dict[str, Any]:
        container = self.get_container(container_id)
        if not container or container.status != "running":
            return {
                "container_id": container_id,
                "name": container.name if container else "unknown",
                "status": container.status if container else "stopped",
                "cpu_percent": 0.0,
                "memory_usage_mb": 0.0,
                "memory_limit_mb": 0.0,
                "memory_percent": 0.0,
                "network_rx_mb": 0.0,
                "network_tx_mb": 0.0,
                "block_read_mb": 0.0,
                "block_write_mb": 0.0,
                "pids_current": 0
            }

        try:
            stats = container.stats(stream=False)
            
            # CPU calculation
            cpu_percent = 0.0
            cpu_stats = stats.get("cpu_stats", {})
            precpu_stats = stats.get("precpu_stats", {})
            cpu_delta = cpu_stats.get("cpu_usage", {}).get("total_usage", 0) - precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
            system_cpu_delta = cpu_stats.get("system_cpu_usage", 0) - precpu_stats.get("system_cpu_usage", 0)
            num_cpus = cpu_stats.get("online_cpus", len(cpu_stats.get("cpu_usage", {}).get("percpu_usage", []) or [1]))
            
            if system_cpu_delta > 0 and cpu_delta > 0:
                cpu_percent = round((cpu_delta / system_cpu_delta) * num_cpus * 100.0, 2)

            # Memory calculation
            mem_stats = stats.get("memory_stats", {})
            mem_usage = mem_stats.get("usage", 0)
            mem_limit = mem_stats.get("limit", 1)
            # Adjust cache if present in stats (cgroups v1/v2)
            inactive_file = mem_stats.get("stats", {}).get("inactive_file", 0)
            if inactive_file and mem_usage > inactive_file:
                mem_usage -= inactive_file
            
            mem_usage_mb = round(mem_usage / (1024 * 1024), 2)
            mem_limit_mb = round(mem_limit / (1024 * 1024), 2)
            mem_percent = round((mem_usage / mem_limit) * 100.0, 2) if mem_limit > 0 else 0.0

            # Network I/O
            rx_bytes = 0
            tx_bytes = 0
            networks = stats.get("networks", {})
            for net in networks.values():
                rx_bytes += net.get("rx_bytes", 0)
                tx_bytes += net.get("tx_bytes", 0)

            # Block I/O
            read_bytes = 0
            write_bytes = 0
            io_service_bytes = stats.get("blkio_stats", {}).get("io_service_bytes_recursive", []) or []
            for entry in io_service_bytes:
                op = entry.get("op", "").lower()
                val = entry.get("value", 0)
                if op == "read":
                    read_bytes += val
                elif op == "write":
                    write_bytes += val

            pids = stats.get("pids_stats", {}).get("current", 0)

            return {
                "container_id": container_id,
                "name": container.name,
                "status": container.status,
                "cpu_percent": cpu_percent,
                "memory_usage_mb": mem_usage_mb,
                "memory_limit_mb": mem_limit_mb,
                "memory_percent": mem_percent,
                "network_rx_mb": round(rx_bytes / (1024 * 1024), 3),
                "network_tx_mb": round(tx_bytes / (1024 * 1024), 3),
                "block_read_mb": round(read_bytes / (1024 * 1024), 3),
                "block_write_mb": round(write_bytes / (1024 * 1024), 3),
                "pids_current": pids
            }
        except Exception as e:
            logger.warning(f"Failed to fetch stats for container {container_id}: {e}")
            return {
                "container_id": container_id,
                "name": container.name,
                "status": container.status,
                "cpu_percent": 0.0,
                "memory_usage_mb": 0.0,
                "memory_limit_mb": 0.0,
                "memory_percent": 0.0,
                "network_rx_mb": 0.0,
                "network_tx_mb": 0.0,
                "block_read_mb": 0.0,
                "block_write_mb": 0.0,
                "pids_current": 0
            }

    # --- File Operations Inside Container ---

    def list_files(self, container_id: str, path: str = "/") -> List[Dict[str, Any]]:
        container = self.get_container(container_id)
        if not container or container.status != "running":
            raise RuntimeError("Container is not running.")

        # Execute safe JSON-formatted listing using standard python or POSIX tools
        # We use a clean shell command that prints JSON records for robust parsing
        clean_path = path.strip() if path.strip() else "/"
        sh_cmd = f"""python3 -c "
import os, sys, json, stat, datetime
target = sys.argv[1]
items = []
try:
    for entry in os.scandir(target):
        st = entry.stat()
        items.append({{'name': entry.name, 'path': entry.path, 'is_dir': entry.is_dir(), 'size': st.st_size, 'modified': datetime.datetime.fromtimestamp(st.st_mtime).strftime('%Y-%m-%d %H:%M:%S'), 'permissions': stat.filemode(st.st_mode)}})
    print(json.dumps(items))
except Exception as e:
    sys.exit(1)
" '{clean_path}' 2>/dev/null || (ls -la '{clean_path}')
"""
        exec_res = container.exec_run(["sh", "-c", sh_cmd])
        output = exec_res.output.decode("utf-8", errors="replace").strip()
        
        # Try JSON parsing first
        try:
            return json.loads(output)
        except Exception:
            pass

        # Fallback to standard ls parser if python3 not inside container (e.g. basic alpine)
        items = []
        for line in output.splitlines():
            parts = line.split(maxsplit=8)
            if len(parts) >= 9 and parts[0] != "total":
                perms, _, _, _, size, _, _, _, name = parts
                if name in [".", ".."]:
                    continue
                is_dir = perms.startswith("d")
                items.append({
                    "name": name,
                    "path": f"{clean_path.rstrip('/')}/{name}",
                    "is_dir": is_dir,
                    "size": int(size) if size.isdigit() else 0,
                    "modified": "N/A",
                    "permissions": perms
                })
        return items

    def read_file(self, container_id: str, file_path: str) -> bytes:
        container = self.get_container(container_id)
        if not container:
            raise RuntimeError("Container not found.")
        
        # Safe extraction using docker get_archive
        bits, stat = container.get_archive(file_path)
        tar_bytes = io.BytesIO()
        for chunk in bits:
            tar_bytes.write(chunk)
        tar_bytes.seek(0)
        
        with tarfile.open(fileobj=tar_bytes) as tar:
            member = tar.next()
            if member and member.isfile():
                f = tar.extractfile(member)
                if f:
                    return f.read()
        return b""

    def write_file(self, container_id: str, file_path: str, content: bytes):
        container = self.get_container(container_id)
        if not container:
            raise RuntimeError("Container not found.")

        dir_name = os.path.dirname(file_path) or "/"
        file_name = os.path.basename(file_path)

        # Create tar in memory
        tar_stream = io.BytesIO()
        with tarfile.open(fileobj=tar_stream, mode="w") as tar:
            tar_info = tarfile.TarInfo(name=file_name)
            tar_info.size = len(content)
            tar_info.mtime = 0
            tar.addfile(tar_info, io.BytesIO(content))
        tar_stream.seek(0)

        # Ensure target dir exists
        container.exec_run(f"mkdir -p '{dir_name}'")
        container.put_archive(dir_name, tar_stream)

    def delete_file(self, container_id: str, target_path: str):
        container = self.get_container(container_id)
        if not container:
            raise RuntimeError("Container not found.")
        container.exec_run(f"rm -rf '{target_path}'")

    def create_directory(self, container_id: str, dir_path: str):
        container = self.get_container(container_id)
        if not container:
            raise RuntimeError("Container not found.")
        container.exec_run(f"mkdir -p '{dir_path}'")

    # --- Image Operations ---

    def list_images(self) -> List[Dict[str, Any]]:
        client = self.get_client()
        result = []
        for img in client.images.list():
            tags = img.tags or ["<none>:<none>"]
            size_mb = round(img.attrs.get("Size", 0) / (1024 * 1024), 2)
            created = img.attrs.get("Created", "")
            for tag in tags:
                repo, tag_name = tag.split(":", 1) if ":" in tag else (tag, "latest")
                result.append({
                    "id": img.short_id.replace("sha256:", ""),
                    "full_id": img.id,
                    "repository": repo,
                    "tag": tag_name,
                    "size_mb": size_mb,
                    "created": created
                })
        return result

    def pull_image(self, image_name: str, tag: str = "latest"):
        client = self.get_client()
        full_name = f"{image_name}:{tag}" if ":" not in image_name else image_name
        return client.images.pull(full_name)

    # --- Volume Operations ---

    def list_volumes(self) -> List[Dict[str, Any]]:
        client = self.get_client()
        volumes = client.volumes.list()
        result = []
        for v in volumes:
            result.append({
                "name": v.name,
                "driver": v.attrs.get("Driver", "local"),
                "mountpoint": v.attrs.get("Mountpoint", ""),
                "created_at": v.attrs.get("CreatedAt", ""),
                "labels": v.attrs.get("Labels", {}) or {}
            })
        return result

    def create_volume(self, name: str, labels: Optional[Dict[str, str]] = None) -> Any:
        client = self.get_client()
        vol_labels = {settings.DOCKER_MANAGED_LABEL_KEY: settings.DOCKER_MANAGED_LABEL_VALUE}
        if labels:
            vol_labels.update(labels)
        return client.volumes.create(name=name, labels=vol_labels)

    def delete_volume(self, name: str, force: bool = False):
        client = self.get_client()
        volume = client.volumes.get(name)
        volume.remove(force=force)

    # --- Network Operations ---

    def list_networks(self) -> List[Dict[str, Any]]:
        client = self.get_client()
        networks = client.networks.list()
        result = []
        for n in networks:
            result.append({
                "id": n.short_id,
                "name": n.name,
                "driver": n.attrs.get("Driver", "bridge"),
                "scope": n.attrs.get("Scope", "local"),
                "containers": len(n.attrs.get("Containers", {}) or {})
            })
        return result

    def create_network(self, name: str, driver: str = "bridge") -> Any:
        client = self.get_client()
        labels = {settings.DOCKER_MANAGED_LABEL_KEY: settings.DOCKER_MANAGED_LABEL_VALUE}
        return client.networks.create(name=name, driver=driver, labels=labels)

docker_service = DockerService()
