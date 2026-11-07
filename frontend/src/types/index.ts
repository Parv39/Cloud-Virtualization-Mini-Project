export interface Environment {
  id: number;
  name: string;
  container_id?: string | null;
  template_type: string;
  image: string;
  image_tag: string;
  status: 'running' | 'exited' | 'paused' | 'creating' | 'error' | 'expired' | 'stopped';
  cpu_limit: number;
  ram_limit_mb: number;
  created_at: string;
  expires_at?: string | null;
  remaining_seconds?: number | null;
  auto_cleanup: boolean;
  description?: string | null;
  volume_name?: string | null;
  volume_mount_path?: string | null;
  network_name?: string | null;
}

export interface EnvironmentCreate {
  name: string;
  template_type: string;
  image?: string;
  image_tag?: string;
  cpu_limit: number;
  ram_limit_mb: number;
  expiration_minutes?: number;
  auto_cleanup: boolean;
  description?: string;
  volume_name?: string;
  volume_mount_path?: string;
  network_name?: string;
}

export interface EnvironmentStats {
  container_id: string;
  name: string;
  status: string;
  cpu_percent: number;
  memory_usage_mb: number;
  memory_limit_mb: number;
  memory_percent: number;
  network_rx_mb: number;
  network_tx_mb: number;
  block_read_mb: number;
  block_write_mb: number;
  pids_current: number;
}

export interface HostMetrics {
  cpu_percent: number;
  cpu_cores: number;
  total_ram_gb: number;
  used_ram_gb: number;
  free_ram_gb: number;
  ram_usage_percent: number;
  drives: Array<{
    device: string;
    mountpoint: string;
    fstype: string;
    total_gb: number;
    used_gb: number;
    free_gb: number;
    percent: number;
  }>;
  docker_status: string;
  docker_version: string;
  active_containers_count: number;
  total_containers_count: number;
}

export interface FileItem {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified: string;
  permissions: string;
}

export interface FileListResponse {
  current_path: string;
  items: FileItem[];
}

export interface PersistentVolume {
  id: number;
  name: string;
  docker_volume_name: string;
  mount_path: string;
  description?: string;
  created_at: string;
}

export interface DockerNetwork {
  id: number;
  name: string;
  docker_network_id: string;
  driver: string;
  subnet?: string;
  created_at: string;
}

export interface ActivityLog {
  id: number;
  environment_id?: number | null;
  environment_name?: string | null;
  action: string;
  status: string;
  details?: string | null;
  timestamp: string;
}

export interface TemplateInfo {
  name: string;
  image: string;
  shell: string;
  description: string;
}
