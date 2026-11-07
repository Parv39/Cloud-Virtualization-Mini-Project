import os
import psutil
from typing import Dict, Any, List
from backend.app.docker.docker_service import docker_service

class MonitoringService:
    @staticmethod
    def get_host_metrics() -> Dict[str, Any]:
        # CPU
        cpu_percent = psutil.cpu_percent(interval=None)
        cpu_cores = psutil.cpu_count(logical=True)

        # RAM
        virtual_mem = psutil.virtual_memory()
        total_ram_gb = round(virtual_mem.total / (1024 ** 3), 2)
        used_ram_gb = round(virtual_mem.used / (1024 ** 3), 2)
        free_ram_gb = round(virtual_mem.available / (1024 ** 3), 2)
        ram_percent = virtual_mem.percent

        # Drives (C:, X:, Y:)
        drives = []
        for partition in psutil.disk_partitions(all=False):
            try:
                # Windows drive check
                if partition.device:
                    usage = psutil.disk_usage(partition.mountpoint)
                    drives.append({
                        "device": partition.device,
                        "mountpoint": partition.mountpoint,
                        "fstype": partition.fstype,
                        "total_gb": round(usage.total / (1024 ** 3), 2),
                        "used_gb": round(usage.used / (1024 ** 3), 2),
                        "free_gb": round(usage.free / (1024 ** 3), 2),
                        "percent": usage.percent
                    })
            except Exception:
                continue

        # Docker Status
        docker_ok = docker_service.ping()
        docker_status = "Online" if docker_ok else "Offline"
        docker_version = "Unknown"
        active_containers = 0
        total_containers = 0

        if docker_ok:
            try:
                sys_info = docker_service.get_system_info()
                docker_version = f"Engine {sys_info.get('version')} (API {sys_info.get('api_version')})"
                active_containers = sys_info.get("containers_running", 0)
                total_containers = sys_info.get("containers_total", 0)
            except Exception:
                pass

        return {
            "cpu_percent": cpu_percent,
            "cpu_cores": cpu_cores,
            "total_ram_gb": total_ram_gb,
            "used_ram_gb": used_ram_gb,
            "free_ram_gb": free_ram_gb,
            "ram_usage_percent": ram_percent,
            "drives": drives,
            "docker_status": docker_status,
            "docker_version": docker_version,
            "active_containers_count": active_containers,
            "total_containers_count": total_containers
        }

    @staticmethod
    def get_container_metrics(container_id: str) -> Dict[str, Any]:
        return docker_service.get_container_stats(container_id)

monitoring_service = MonitoringService()
