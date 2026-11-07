import React, { useState, useEffect } from 'react';
import {
  Activity,
  Cpu,
  Layers,
  HardDrive,
  Network,
  Server,
  RefreshCw,
  Clock,
  CircleDot
} from 'lucide-react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { api } from '../services/api';
import { HostMetrics, Environment, EnvironmentStats } from '../types';

export const MonitoringView: React.FC = () => {
  const [hostMetrics, setHostMetrics] = useState<HostMetrics | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<number | null>(null);
  const [containerStats, setContainerStats] = useState<EnvironmentStats | null>(null);

  // Time-series history for container
  const [history, setHistory] = useState<Array<{
    time: string;
    cpu: number;
    ram_mb: number;
    rx_mb: number;
    tx_mb: number;
  }>>([]);

  const loadHostData = async () => {
    try {
      const host = await api.getHostMetrics();
      setHostMetrics(host);
    } catch (e) {
      console.error('Failed to load host metrics:', e);
    }
  };

  const loadEnvs = async () => {
    try {
      const data = await api.getEnvironments();
      const running = data.filter((e) => e.status === 'running');
      setEnvironments(running);
      if (running.length > 0 && selectedEnvId === null) {
        setSelectedEnvId(running[0].id);
      }
    } catch (e) {
      console.error('Failed to load environments:', e);
    }
  };

  const loadContainerStats = async () => {
    if (!selectedEnvId) return;
    try {
      const stats = await api.getEnvironmentStats(selectedEnvId);
      setContainerStats(stats);

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setHistory((prev) => {
        const next = [...prev, {
          time: now,
          cpu: stats.cpu_percent,
          ram_mb: stats.memory_usage_mb,
          rx_mb: stats.network_rx_mb,
          tx_mb: stats.network_tx_mb
        }];
        return next.slice(-20); // Keep last 20 ticks
      });
    } catch (e) {
      console.error('Failed to load container stats:', e);
    }
  };

  useEffect(() => {
    loadHostData();
    loadEnvs();
    const hostInterval = setInterval(loadHostData, 5000);
    return () => clearInterval(hostInterval);
  }, []);

  useEffect(() => {
    setHistory([]);
    loadContainerStats();
    const containerInterval = setInterval(loadContainerStats, 2500);
    return () => clearInterval(containerInterval);
  }, [selectedEnvId]);

  return (
    <div className="space-y-6">
      {/* Host Metrics Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2.5">
            <Server className="w-5 h-5 text-primary-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">Host System Telemetry</h3>
          </div>
          <span className="text-xs text-gray-500 font-mono">AMD Ryzen 5600H • Windows 11</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CPU Load */}
          <div className="p-5 bg-surface border border-surface-border rounded-xl">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>HOST CPU UTILIZATION</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-bold font-mono text-cyan-400">{hostMetrics?.cpu_percent ?? 0}%</span>
              <span className="text-xs text-gray-400">across {hostMetrics?.cpu_cores ?? 12} cores</span>
            </div>
            <div className="mt-3 w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, hostMetrics?.cpu_percent || 0)}%` }}
              />
            </div>
          </div>

          {/* Physical RAM */}
          <div className="p-5 bg-surface border border-surface-border rounded-xl">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>PHYSICAL RAM LOAD</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-3xl font-bold font-mono text-blue-400">
                {hostMetrics?.ram_usage_percent ?? 0}%
              </span>
              <span className="text-xs text-gray-400">
                ({hostMetrics?.used_ram_gb ?? 0} / {hostMetrics?.total_ram_gb ?? 0} GB)
              </span>
            </div>
            <div className="mt-3 w-full bg-surface-elevated rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, hostMetrics?.ram_usage_percent || 0)}%` }}
              />
            </div>
          </div>

          {/* Docker Daemon Status */}
          <div className="p-5 bg-surface border border-surface-border rounded-xl">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>DOCKER ENGINE</span>
              <CircleDot className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {hostMetrics?.docker_status ?? 'Connecting'}
              </span>
            </div>
            <p className="mt-2 text-xs text-gray-400 truncate">
              {hostMetrics?.active_containers_count ?? 0} running / {hostMetrics?.total_containers_count ?? 0} total containers
            </p>
          </div>
        </div>

        {/* Drives Breakdown */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {hostMetrics?.drives.map((d) => (
            <div key={d.device} className="p-4 bg-surface border border-surface-border rounded-xl">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-bold text-gray-300">{d.device} ({d.fstype})</span>
                <HardDrive className="w-4 h-4 text-gray-400" />
              </div>
              <div className="mt-2 flex items-baseline justify-between text-xs">
                <span className="text-sm font-bold font-mono text-white">{d.free_gb} GB Free</span>
                <span className="text-gray-500">{d.used_gb} / {d.total_gb} GB</span>
              </div>
              <div className="mt-2 w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    d.device.startsWith('X:') ? 'bg-emerald-400' : 'bg-gray-400'
                  }`}
                  style={{ width: `${d.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Container Telemetry Section */}
      <div className="pt-4 border-t border-surface-border">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-white">
              Container Isolation Telemetry (Cgroups v2)
            </h3>
          </div>

          {/* Container Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-400">Select Container:</span>
            <select
              value={selectedEnvId || ''}
              onChange={(e) => setSelectedEnvId(Number(e.target.value))}
              className="px-3 py-1.5 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white"
            >
              {environments.length === 0 ? (
                <option value="">No running environments</option>
              ) : (
                environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name} ({env.image})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {containerStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div className="p-4 bg-surface border border-surface-border rounded-xl">
              <span className="text-[11px] text-gray-400 uppercase font-semibold">CONTAINER CPU</span>
              <p className="text-xl font-bold font-mono text-cyan-400 mt-1">{containerStats.cpu_percent}%</p>
              <span className="text-[10px] text-gray-500">Live cgroup metric</span>
            </div>
            <div className="p-4 bg-surface border border-surface-border rounded-xl">
              <span className="text-[11px] text-gray-400 uppercase font-semibold">MEMORY CONSUMPTION</span>
              <p className="text-xl font-bold font-mono text-blue-400 mt-1">
                {containerStats.memory_usage_mb} MB
              </p>
              <span className="text-[10px] text-gray-500">Limit: {containerStats.memory_limit_mb} MB ({containerStats.memory_percent}%)</span>
            </div>
            <div className="p-4 bg-surface border border-surface-border rounded-xl">
              <span className="text-[11px] text-gray-400 uppercase font-semibold">NETWORK I/O</span>
              <p className="text-sm font-bold font-mono text-emerald-400 mt-1">
                Rx: {containerStats.network_rx_mb} MB | Tx: {containerStats.network_tx_mb} MB
              </p>
              <span className="text-[10px] text-gray-500">Virtual bridge namespace</span>
            </div>
            <div className="p-4 bg-surface border border-surface-border rounded-xl">
              <span className="text-[11px] text-gray-400 uppercase font-semibold">BLOCK I/O & PROCESSES</span>
              <p className="text-sm font-bold font-mono text-white mt-1">
                R: {containerStats.block_read_mb} MB | W: {containerStats.block_write_mb} MB
              </p>
              <span className="text-[10px] text-gray-500">Active PIDs: {containerStats.pids_current}</span>
            </div>
          </div>
        )}

        {/* Live Recharts Graph */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* CPU Chart */}
          <div className="p-5 bg-surface border border-surface-border rounded-xl">
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Real-time Container CPU Usage (%)
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    name="CPU %"
                    stroke="#06B6D4"
                    fillOpacity={1}
                    fill="url(#cpuGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Memory Chart */}
          <div className="p-5 bg-surface border border-surface-border rounded-xl">
            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-4">
              Real-time Container Memory Usage (MB)
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history}>
                  <defs>
                    <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6B7280" tick={{ fontSize: 10 }} domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', fontSize: 12 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="ram_mb"
                    name="RAM (MB)"
                    stroke="#3B82F6"
                    fillOpacity={1}
                    fill="url(#ramGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
