import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Play,
  Square,
  Terminal,
  Activity,
  Clock,
  Plus,
  Cpu,
  Layers,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import { api } from '../services/api';
import { Environment, HostMetrics, ActivityLog } from '../types';

interface OverviewProps {
  onNavigate: (tab: string, envId?: number) => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigate }) => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [metrics, setMetrics] = useState<HostMetrics | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [envs, hostM, logs] = await Promise.all([
        api.getEnvironments(),
        api.getHostMetrics(),
        api.getActivityLogs(8)
      ]);
      setEnvironments(envs);
      setMetrics(hostM);
      setActivities(logs);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const runningEnvs = environments.filter((e) => e.status === 'running');
  const stoppedEnvs = environments.filter((e) => e.status !== 'running' && e.status !== 'expired');
  const totalAllocatedRam = environments
    .filter((e) => e.status === 'running')
    .reduce((sum, e) => sum + e.ram_limit_mb, 0);

  const formatRemainingTime = (seconds?: number | null) => {
    if (seconds === undefined || seconds === null) return 'No Expiration';
    if (seconds <= 0) return 'Expired';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex items-center justify-between p-6 bg-gradient-to-r from-surface via-surface-elevated to-surface border border-surface-border rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-wide">
            Disposable Virtual Environment Manager
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Genuine Linux container virtualization powered by Docker Desktop Engine (WSL2 Cgroups v2).
          </p>
        </div>
        <button
          onClick={() => onNavigate('create')}
          className="flex items-center space-x-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-medium text-sm rounded-lg shadow-lg shadow-primary-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Environment</span>
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Environments */}
        <div className="p-5 bg-surface border border-surface-border rounded-xl">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>TOTAL MANAGED</span>
            <Boxes className="w-4 h-4 text-primary-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">{environments.length}</span>
            <span className="text-xs text-gray-400">environments</span>
          </div>
          <div className="mt-2 text-xs text-gray-400 flex items-center space-x-2">
            <span className="text-emerald-400 font-medium">{runningEnvs.length} Active</span>
            <span>•</span>
            <span className="text-gray-400">{stoppedEnvs.length} Stopped</span>
          </div>
        </div>

        {/* Assigned RAM */}
        <div className="p-5 bg-surface border border-surface-border rounded-xl">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>ALLOCATED RAM (CONTAINERS)</span>
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-cyan-400">
              {(totalAllocatedRam / 1024).toFixed(2)}
            </span>
            <span className="text-xs text-gray-400">GB</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Out of {metrics?.free_ram_gb || 0} GB free host memory
          </div>
        </div>

        {/* Host CPU Utilization */}
        <div className="p-5 bg-surface border border-surface-border rounded-xl">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>HOST CPU LOAD</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-white">
              {metrics?.cpu_percent ?? 0}%
            </span>
            <span className="text-xs text-gray-400">AMD Ryzen 5600H</span>
          </div>
          <div className="mt-2 w-full bg-surface-elevated rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, metrics?.cpu_percent || 0)}%` }}
            />
          </div>
        </div>

        {/* X: Drive Storage (Project Root) */}
        <div className="p-5 bg-surface border border-surface-border rounded-xl">
          <div className="flex items-center justify-between text-gray-400 text-xs">
            <span>STORAGE (X: DRIVE)</span>
            <HardDrive className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold font-mono text-emerald-400">
              {metrics?.drives?.find((d) => d.device.startsWith('X:'))?.free_gb ?? 91.5}
            </span>
            <span className="text-xs text-gray-400">GB Free</span>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Total capacity: {metrics?.drives?.find((d) => d.device.startsWith('X:'))?.total_gb ?? 200} GB
          </div>
        </div>
      </div>

      {/* Active Environments & Recent Activities Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Environments (2 cols) */}
        <div className="lg:col-span-2 bg-surface border border-surface-border rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
                <Boxes className="w-4 h-4 text-primary-400" />
                <span>Active Environments</span>
              </h3>
              <button
                onClick={() => onNavigate('environments')}
                className="text-xs text-primary-400 hover:text-primary-300 font-medium"
              >
                View All ({environments.length})
              </button>
            </div>

            {environments.length === 0 ? (
              <div className="py-12 text-center text-gray-500">
                <Boxes className="w-10 h-10 mx-auto text-gray-600 mb-2" />
                <p className="text-sm">No environments created yet.</p>
                <p className="text-xs text-gray-600 mt-1">
                  Click 'New Environment' above to spin up your first isolated Linux container.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {environments.slice(0, 4).map((env) => (
                  <div
                    key={env.id}
                    className="p-3.5 bg-surface-elevated/40 border border-surface-border/60 hover:border-surface-border rounded-lg flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center space-x-3.5">
                      <div className="p-2 bg-surface-elevated rounded-lg text-primary-400">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm text-white">{env.name}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium uppercase ${
                              env.status === 'running'
                                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                                : env.status === 'paused'
                                ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                                : 'bg-gray-500/10 text-gray-400'
                            }`}
                          >
                            {env.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 flex items-center space-x-3 mt-0.5">
                          <span>{env.image}</span>
                          <span>•</span>
                          <span>{env.ram_limit_mb} MB RAM</span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span>{formatRemainingTime(env.remaining_seconds)}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {env.status === 'running' && (
                        <button
                          onClick={() => onNavigate('terminal', env.id)}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 rounded-lg text-xs font-medium border border-primary-500/30 transition-colors"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Terminal</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Activities (1 col) */}
        <div className="bg-surface border border-surface-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Recent Activity</span>
            </h3>
            <button
              onClick={() => onNavigate('activity')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium"
            >
              Full Log
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[320px]">
            {activities.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-8">No recent activity records.</p>
            ) : (
              activities.map((act) => (
                <div key={act.id} className="text-xs border-b border-surface-border/50 pb-2.5 last:border-none">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-300 capitalize">
                      {act.action.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-gray-400 mt-0.5 line-clamp-2">{act.details}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
