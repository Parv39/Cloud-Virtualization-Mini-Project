import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

# --- Environment Schemas ---
class EnvironmentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    template_type: str = Field("ubuntu", description="ubuntu, python, nodejs, alpine")
    image: Optional[str] = None
    image_tag: str = "latest"
    cpu_limit: float = Field(0.5, ge=0.1, le=4.0)
    ram_limit_mb: int = Field(512, ge=128, le=8192)
    expiration_minutes: Optional[int] = Field(60, ge=0, le=1440) # 0 means no expiration
    auto_cleanup: bool = True
    description: Optional[str] = None
    volume_name: Optional[str] = None
    volume_mount_path: Optional[str] = "/data"
    network_name: Optional[str] = "bridge"

class EnvironmentResponse(BaseModel):
    id: int
    name: str
    container_id: Optional[str] = None
    template_type: str
    image: str
    image_tag: str
    status: str
    cpu_limit: float
    ram_limit_mb: int
    created_at: datetime.datetime
    expires_at: Optional[datetime.datetime] = None
    remaining_seconds: Optional[int] = None
    auto_cleanup: bool
    description: Optional[str] = None
    volume_name: Optional[str] = None
    volume_mount_path: Optional[str] = None
    network_name: Optional[str] = None

    class Config:
        from_attributes = True

class EnvironmentStats(BaseModel):
    container_id: str
    name: str
    status: str
    cpu_percent: float
    memory_usage_mb: float
    memory_limit_mb: float
    memory_percent: float
    network_rx_mb: float
    network_tx_mb: float
    block_read_mb: float
    block_write_mb: float
    pids_current: int

# --- Volume Schemas ---
class VolumeCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    mount_path: str = Field("/data", min_length=1)
    description: Optional[str] = None

class VolumeResponse(BaseModel):
    id: int
    name: str
    docker_volume_name: str
    mount_path: str
    description: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Network Schemas ---
class NetworkCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    driver: str = "bridge"

class NetworkResponse(BaseModel):
    id: int
    name: str
    docker_network_id: str
    driver: str
    subnet: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- File Management Schemas ---
class FileItem(BaseModel):
    name: str
    path: str
    is_dir: bool
    size: int
    modified: str
    permissions: str

class FileListResponse(BaseModel):
    current_path: str
    items: List[FileItem]

class FileCreateRequest(BaseModel):
    path: str
    content: str = ""

class FolderCreateRequest(BaseModel):
    path: str

# --- Activity Log Schemas ---
class ActivityLogResponse(BaseModel):
    id: int
    environment_id: Optional[int] = None
    environment_name: Optional[str] = None
    action: str
    status: str
    details: Optional[str] = None
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# --- Host Metrics Schemas ---
class HostMetricsResponse(BaseModel):
    cpu_percent: float
    cpu_cores: int
    total_ram_gb: float
    used_ram_gb: float
    free_ram_gb: float
    ram_usage_percent: float
    drives: List[dict]
    docker_status: str
    docker_version: str
    active_containers_count: int
    total_containers_count: int
