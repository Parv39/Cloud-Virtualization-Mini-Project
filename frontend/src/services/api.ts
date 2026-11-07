import {
  Environment,
  EnvironmentCreate,
  EnvironmentStats,
  HostMetrics,
  FileListResponse,
  PersistentVolume,
  DockerNetwork,
  ActivityLog,
  TemplateInfo
} from '../types';

const BASE_URL = '/api';

export const api = {
  // System
  async getHealth() {
    const res = await fetch(`${BASE_URL}/system/health`);
    return res.json();
  },
  async getDockerInfo() {
    const res = await fetch(`${BASE_URL}/system/docker`);
    return res.json();
  },
  async getTemplates(): Promise<Record<string, TemplateInfo>> {
    const res = await fetch(`${BASE_URL}/system/templates`);
    return res.json();
  },

  // Environments
  async getEnvironments(): Promise<Environment[]> {
    const res = await fetch(`${BASE_URL}/environments`);
    if (!res.ok) throw new Error('Failed to fetch environments');
    return res.json();
  },
  async getEnvironment(id: number): Promise<Environment> {
    const res = await fetch(`${BASE_URL}/environments/${id}`);
    if (!res.ok) throw new Error('Failed to fetch environment');
    return res.json();
  },
  async createEnvironment(data: EnvironmentCreate): Promise<Environment> {
    const res = await fetch(`${BASE_URL}/environments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create environment');
    }
    return res.json();
  },
  async deleteEnvironment(id: number): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/environments/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete environment');
    return res.json();
  },
  async startEnvironment(id: number) {
    const res = await fetch(`${BASE_URL}/environments/${id}/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start environment');
    return res.json();
  },
  async stopEnvironment(id: number) {
    const res = await fetch(`${BASE_URL}/environments/${id}/stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop environment');
    return res.json();
  },
  async restartEnvironment(id: number) {
    const res = await fetch(`${BASE_URL}/environments/${id}/restart`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to restart environment');
    return res.json();
  },
  async pauseEnvironment(id: number) {
    const res = await fetch(`${BASE_URL}/environments/${id}/pause`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to pause environment');
    return res.json();
  },
  async unpauseEnvironment(id: number) {
    const res = await fetch(`${BASE_URL}/environments/${id}/unpause`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to resume environment');
    return res.json();
  },
  async extendEnvironment(id: number, minutes: number = 30) {
    const res = await fetch(`${BASE_URL}/environments/${id}/extend?minutes=${minutes}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to extend environment');
    return res.json();
  },
  async getEnvironmentStats(id: number): Promise<EnvironmentStats> {
    const res = await fetch(`${BASE_URL}/environments/${id}/stats`);
    if (!res.ok) throw new Error('Failed to fetch environment stats');
    return res.json();
  },
  async getEnvironmentLogs(id: number, tail: number = 200): Promise<{ logs: string }> {
    const res = await fetch(`${BASE_URL}/environments/${id}/logs?tail=${tail}`);
    if (!res.ok) throw new Error('Failed to fetch logs');
    return res.json();
  },

  // Files
  async listFiles(envId: number, path: string = '/'): Promise<FileListResponse> {
    const res = await fetch(`${BASE_URL}/environments/${envId}/files?path=${encodeURIComponent(path)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to list directory contents');
    }
    return res.json();
  },
  async uploadFile(envId: number, path: string, file: File): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/environments/${envId}/files/upload?path=${encodeURIComponent(path)}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload file');
    return res.json();
  },
  async createFile(envId: number, path: string, content: string = ''): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/environments/${envId}/files/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, content }),
    });
    if (!res.ok) throw new Error('Failed to create file');
    return res.json();
  },
  async createFolder(envId: number, path: string): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/environments/${envId}/files/folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error('Failed to create folder');
    return res.json();
  },
  async deleteFile(envId: number, path: string): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/environments/${envId}/files?path=${encodeURIComponent(path)}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete file');
    return res.json();
  },
  getDownloadUrl(envId: number, path: string): string {
    return `${BASE_URL}/environments/${envId}/files/download?path=${encodeURIComponent(path)}`;
  },

  // Monitoring
  async getHostMetrics(): Promise<HostMetrics> {
    const res = await fetch(`${BASE_URL}/monitoring/host`);
    if (!res.ok) throw new Error('Failed to fetch host metrics');
    return res.json();
  },

  // Images
  async listImages(): Promise<any[]> {
    const res = await fetch(`${BASE_URL}/images`);
    if (!res.ok) throw new Error('Failed to fetch images');
    return res.json();
  },
  async pullImage(imageName: string, tag: string = 'latest'): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/images/pull?image_name=${encodeURIComponent(imageName)}&tag=${encodeURIComponent(tag)}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to pull image');
    return res.json();
  },

  // Volumes
  async listVolumes(): Promise<PersistentVolume[]> {
    const res = await fetch(`${BASE_URL}/volumes`);
    if (!res.ok) throw new Error('Failed to fetch volumes');
    return res.json();
  },
  async createVolume(name: string, mountPath: string = '/data', description?: string): Promise<PersistentVolume> {
    const res = await fetch(`${BASE_URL}/volumes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mount_path: mountPath, description }),
    });
    if (!res.ok) throw new Error('Failed to create volume');
    return res.json();
  },
  async deleteVolume(id: number): Promise<{ message: string }> {
    const res = await fetch(`${BASE_URL}/volumes/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete volume');
    return res.json();
  },

  // Networks
  async listNetworks(): Promise<DockerNetwork[]> {
    const res = await fetch(`${BASE_URL}/networks`);
    if (!res.ok) throw new Error('Failed to fetch networks');
    return res.json();
  },
  async createNetwork(name: string, driver: string = 'bridge'): Promise<DockerNetwork> {
    const res = await fetch(`${BASE_URL}/networks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, driver }),
    });
    if (!res.ok) throw new Error('Failed to create network');
    return res.json();
  },

  // Activity Logs
  async getActivityLogs(limit: number = 50): Promise<ActivityLog[]> {
    const res = await fetch(`${BASE_URL}/activity?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch activity logs');
    return res.json();
  },

  // Terminal WebSocket URL
  getTerminalWsUrl(envId: number): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/environments/${envId}/terminal`;
  }
};
