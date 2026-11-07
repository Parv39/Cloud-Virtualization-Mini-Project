import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Play,
  Square,
  RotateCw,
  Pause,
  Trash2,
  Terminal,
  Clock,
  HardDrive,
  Cpu,
  Plus,
  AlertCircle,
  FolderTree,
  MoreVertical,
  Activity
} from 'lucide-react';
import { api } from '../services/api';
import { Environment } from '../types';

interface MyEnvironmentsProps {
  onNavigate: (tab: string, envId?: number) => void;
}

export const MyEnvironments: React.FC<MyEnvironmentsProps> = ({ onNavigate }) => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const loadEnvironments = async () => {
    try {
      const data = await api.getEnvironments();
      setEnvironments(data);
    } catch (err) {
      console.error('Failed to load environments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEnvironments();
    const interval = setInterval(loadEnvironments, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.startEnvironment(id);
      await loadEnvironments();
    } catch (err) {
      alert(`Start failed: ${err}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStop = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.stopEnvironment(id);
      await loadEnvironments();
    } catch (err) {
      alert(`Stop failed: ${err}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestart = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.restartEnvironment(id);
      await loadEnvironments();
    } catch (err) {
      alert(`Restart failed: ${err}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePause = async (id: number, currentStatus: string) => {
    setActionLoadingId(id);
    try {
      if (currentStatus === 'paused') {
        await api.unpauseEnvironment(id);
      } else {
        await api.pauseEnvironment(id);
      }
      await loadEnvironments();
    } catch (err) {
      alert(`Action failed: ${err}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExtend = async (id: number) => {
    try {
      await api.extendEnvironment(id, 30);
      await loadEnvironments();
    } catch (err) {
      alert(`Failed to extend: ${err}`);
    }
  };

  const handleDelete = async (id: number) => {
    setActionLoadingId(id);
    try {
      await api.deleteEnvironment(id);
      setDeleteConfirmId(null);
      await loadEnvironments();
    } catch (err) {
      alert(`Failed to delete: ${err}`);
    } finally {
      setActionLoadingId(null);
    }
  };

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
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">My Managed Environments</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Real Docker containers running with isolated Linux namespaces and cgroup limits.
          </p>
        </div>
        <button
          onClick={() => onNavigate('create')}
          className="flex items-center space-x-2 px-3.5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-medium shadow-md shadow-primary-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Environment</span>
        </button>
      </div>

      {/* Environments Grid */}
      {environments.length === 0 ? (
        <div className="p-12 text-center bg-surface border border-surface-border rounded-xl">
          <Boxes className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <h3 className="text-sm font-semibold text-gray-300">No Environments Found</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
            You haven't provisioned any virtual environments yet. Create an Ubuntu, Python, Node.js or Alpine environment to get started.
          </p>
          <button
            onClick={() => onNavigate('create')}
            className="mt-4 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 border border-primary-500/30 rounded-lg text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Launch Container</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {environments.map((env) => {
            const isLoading = actionLoadingId === env.id;
            return (
              <div
                key={env.id}
                className="bg-surface border border-surface-border rounded-xl overflow-hidden hover:border-surface-border/80 transition-all flex flex-col justify-between"
              >
                {/* Card Header */}
                <div className="p-5 border-b border-surface-border/60">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-white tracking-wide">{env.name}</h3>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {env.container_id ? env.container_id.slice(0, 12) : 'No Container'}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                        env.status === 'running'
                          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                          : env.status === 'paused'
                          ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                          : 'bg-gray-500/10 text-gray-400 ring-1 ring-gray-500/20'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                          env.status === 'running'
                            ? 'bg-emerald-400 animate-pulse'
                            : env.status === 'paused'
                            ? 'bg-amber-400'
                            : 'bg-gray-400'
                        }`}
                      />
                      {env.status}
                    </span>
                  </div>

                  {/* Spec Chips */}
                  <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                    <div className="p-2 bg-surface-elevated/50 rounded-lg border border-surface-border/40">
                      <span className="text-[10px] text-gray-500 block">IMAGE</span>
                      <span className="text-gray-300 font-mono text-[11px] truncate block" title={env.image}>
                        {env.image}
                      </span>
                    </div>
                    <div className="p-2 bg-surface-elevated/50 rounded-lg border border-surface-border/40">
                      <span className="text-[10px] text-gray-500 block">RESOURCES</span>
                      <span className="text-cyan-400 font-mono text-[11px] block">
                        {env.ram_limit_mb}MB / {env.cpu_limit} CPU
                      </span>
                    </div>
                  </div>

                  {/* Expiration Info */}
                  <div className="mt-3.5 flex items-center justify-between text-xs text-gray-400">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                      <span>Expires in:</span>
                    </span>
                    <span className="font-mono text-white text-[11px]">
                      {formatRemainingTime(env.remaining_seconds)}
                    </span>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-surface-elevated/20 border-t border-surface-border/60 flex items-center justify-between gap-1.5">
                  <div className="flex items-center space-x-1.5">
                    {env.status === 'running' ? (
                      <>
                        <button
                          onClick={() => onNavigate('terminal', env.id)}
                          title="Open Interactive Terminal"
                          className="flex items-center space-x-1 px-2.5 py-1.5 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 border border-primary-500/30 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Terminal className="w-3.5 h-3.5" />
                          <span>Terminal</span>
                        </button>
                        <button
                          onClick={() => onNavigate('files', env.id)}
                          title="Open File Manager"
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-surface-elevated rounded-lg transition-colors"
                        >
                          <FolderTree className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleStop(env.id)}
                          disabled={isLoading}
                          title="Stop Container"
                          className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-surface-elevated rounded-lg transition-colors"
                        >
                          <Square className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRestart(env.id)}
                          disabled={isLoading}
                          title="Restart Container"
                          className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-surface-elevated rounded-lg transition-colors"
                        >
                          <RotateCw className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handlePause(env.id, env.status)}
                          disabled={isLoading}
                          title="Pause Container"
                          className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-surface-elevated rounded-lg transition-colors"
                        >
                          <Pause className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleStart(env.id)}
                          disabled={isLoading}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{env.status === 'expired' ? 'Relaunch' : 'Start'}</span>
                        </button>
                        {env.status === 'paused' && (
                          <button
                            onClick={() => handlePause(env.id, env.status)}
                            disabled={isLoading}
                            className="flex items-center space-x-1 px-2.5 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-medium"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Resume</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    {env.expires_at && (
                      <button
                        onClick={() => handleExtend(env.id)}
                        title="Extend Lifetime (+30m)"
                        className="px-2 py-1 text-[11px] text-gray-400 hover:text-cyan-400 hover:bg-surface-elevated rounded border border-surface-border"
                      >
                        +30m
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirmId(env.id)}
                      title="Delete Environment"
                      className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-surface-elevated rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Delete Confirmation Modal */}
                {deleteConfirmId === env.id && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-surface border border-surface-border p-6 rounded-xl max-w-sm w-full space-y-4">
                      <div className="flex items-center space-x-3 text-rose-400">
                        <AlertCircle className="w-6 h-6" />
                        <h4 className="font-bold text-white text-sm">Confirm Deletion</h4>
                      </div>
                      <p className="text-xs text-gray-300">
                        Are you sure you want to delete environment{' '}
                        <strong className="text-white font-mono">{env.name}</strong>?
                        This will permanently destroy the Docker container. Persistent volumes will NOT be deleted.
                      </p>
                      <div className="flex items-center justify-end space-x-2 pt-2">
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 text-xs text-gray-400 hover:text-white rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(env.id)}
                          disabled={isLoading}
                          className="px-3.5 py-1.5 text-xs bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-medium shadow-sm"
                        >
                          {isLoading ? 'Deleting...' : 'Delete Container'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
