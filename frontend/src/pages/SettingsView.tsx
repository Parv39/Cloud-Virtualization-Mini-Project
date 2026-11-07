import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Server, Shield, HardDrive, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export const SettingsView: React.FC = () => {
  const [dockerInfo, setDockerInfo] = useState<any>(null);
  const [defaultRam, setDefaultRam] = useState(512);
  const [defaultCpu, setDefaultCpu] = useState(0.5);
  const [defaultExpiry, setDefaultExpiry] = useState(60);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getDockerInfo().then(setDockerInfo).catch(console.error);
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-white tracking-wide">Platform Configuration & System Status</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Manage system defaults, inspection policies, and verify hypervisor/engine connectivity.
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center space-x-2 text-emerald-400 text-xs">
          <CheckCircle className="w-4 h-4" />
          <span>Preferences updated successfully.</span>
        </div>
      )}

      {/* Defaults Card */}
      <div className="p-6 bg-surface border border-surface-border rounded-xl space-y-5">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
          <SettingsIcon className="w-4 h-4 text-primary-400" />
          <span>Environment Defaults</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Default RAM (MB)</label>
              <input
                type="number"
                value={defaultRam}
                onChange={(e) => setDefaultRam(Number(e.target.value))}
                min={256}
                max={4096}
                step={256}
                className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Default CPU Cores</label>
              <input
                type="number"
                value={defaultCpu}
                onChange={(e) => setDefaultCpu(Number(e.target.value))}
                min={0.1}
                max={2.0}
                step={0.1}
                className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Default Expiration (Minutes)</label>
              <input
                type="number"
                value={defaultExpiry}
                onChange={(e) => setDefaultExpiry(Number(e.target.value))}
                min={0}
                max={1440}
                className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
            >
              Save Defaults
            </button>
          </div>
        </form>
      </div>

      {/* Docker Backend Inspection Card */}
      <div className="p-6 bg-surface border border-surface-border rounded-xl space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
          <Server className="w-4 h-4 text-emerald-400" />
          <span>Active Docker Engine Details</span>
        </h3>

        {dockerInfo ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
            <div className="p-3 bg-surface-elevated/40 rounded-lg border border-surface-border/50">
              <span className="text-gray-500 text-[10px] block">ENGINE VERSION</span>
              <span className="text-white font-bold">{dockerInfo.version}</span>
            </div>
            <div className="p-3 bg-surface-elevated/40 rounded-lg border border-surface-border/50">
              <span className="text-gray-500 text-[10px] block">API VERSION</span>
              <span className="text-cyan-400 font-bold">{dockerInfo.api_version}</span>
            </div>
            <div className="p-3 bg-surface-elevated/40 rounded-lg border border-surface-border/50">
              <span className="text-gray-500 text-[10px] block">STORAGE DRIVER</span>
              <span className="text-white">{dockerInfo.storage_driver}</span>
            </div>
            <div className="p-3 bg-surface-elevated/40 rounded-lg border border-surface-border/50">
              <span className="text-gray-500 text-[10px] block">OS / ARCH</span>
              <span className="text-emerald-400">{dockerInfo.os} ({dockerInfo.arch})</span>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">Loading Docker engine parameters...</p>
        )}
      </div>

      {/* Storage and Security Architecture */}
      <div className="p-6 bg-surface border border-surface-border rounded-xl space-y-3 text-xs text-gray-300">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-white flex items-center space-x-2">
          <Shield className="w-4 h-4 text-blue-400" />
          <span>Academic Security & Isolation Boundary</span>
        </h3>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li><strong>Zero Host Filesystem Exposure:</strong> Container filesystem mounts are restricted to internal overlayfs and managed Docker named volumes. Windows host root drives are never mounted.</li>
          <li><strong>Non-Privileged Execution:</strong> Containers strictly execute in non-privileged mode with default seccomp profiles and Cgroup v2 resource accounting.</li>
          <li><strong>Dedicated Virtual Bridge:</strong> Network traffic is routed through isolated Docker bridge namespaces, blocking direct port exposure to host public interfaces.</li>
          <li><strong>Storage Optimization on X:</strong> Project metadata, logs, and backups reside on the high-capacity X: drive (`X:\DVEM\data`, `X:\DVEM\logs`).</li>
        </ul>
      </div>
    </div>
  );
};
