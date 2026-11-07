import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Boxes,
  PlusCircle,
  Terminal,
  FolderTree,
  Activity,
  Layers,
  HardDrive,
  Network,
  History,
  Settings,
  Cpu,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { HostMetrics } from '../types';

interface AppLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ currentTab, setCurrentTab, children }) => {
  const [metrics, setMetrics] = useState<HostMetrics | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHostStatus = async () => {
    try {
      const data = await api.getHostMetrics();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to update host metrics:', err);
    }
  };

  useEffect(() => {
    fetchHostStatus();
    const interval = setInterval(fetchHostStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchHostStatus();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'environments', label: 'My Environments', icon: Boxes },
    { id: 'create', label: 'Create Environment', icon: PlusCircle },
    { id: 'terminal', label: 'Terminal', icon: Terminal },
    { id: 'files', label: 'File Manager', icon: FolderTree },
    { id: 'monitoring', label: 'Resource Monitoring', icon: Activity },
    { id: 'images', label: 'Docker Images', icon: Layers },
    { id: 'volumes', label: 'Persistent Volumes', icon: HardDrive },
    { id: 'networks', label: 'Networks', icon: Network },
    { id: 'activity', label: 'Activity Logs', icon: History },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-gray-200">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-surface border-r border-surface-border flex flex-col justify-between">
        <div>
          {/* Logo / Brand */}
          <div className="px-6 py-5 border-b border-surface-border flex items-center space-x-3">
            <div className="p-2 bg-primary-600/20 text-primary-500 rounded-lg ring-1 ring-primary-500/30">
              <Boxes className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide text-white font-mono">DVEM</h1>
              <p className="text-xs text-gray-400">Virtual Environment Manager</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-surface-elevated/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary-400' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Engine status footer */}
        <div className="p-4 border-t border-surface-border bg-surface-elevated/30">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-gray-400 flex items-center space-x-1.5">
              <Server className="w-3.5 h-3.5 text-gray-400" />
              <span>Docker Desktop</span>
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
              metrics?.docker_status === 'Online'
                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full mr-1 ${
                metrics?.docker_status === 'Online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`} />
              {metrics?.docker_status || 'Checking...'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 truncate" title={metrics?.docker_version}>
            {metrics?.docker_version || 'Connecting...'}
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-surface-border bg-surface/50 backdrop-blur px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center space-x-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
              {navItems.find((n) => n.id === currentTab)?.label || 'Dashboard'}
            </h2>
          </div>

          {/* Quick Metrics Header Stats */}
          <div className="flex items-center space-x-6 text-xs text-gray-400">
            {metrics && (
              <>
                <div className="flex items-center space-x-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span>CPU:</span>
                  <span className="text-white font-mono font-medium">{metrics.cpu_percent}%</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-blue-400 font-mono">RAM:</span>
                  <span className="text-white font-mono font-medium">
                    {metrics.used_ram_gb} / {metrics.total_ram_gb} GB ({metrics.ram_usage_percent}%)
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-mono">Active:</span>
                  <span className="text-white font-mono font-medium">{metrics.active_containers_count} env(s)</span>
                </div>
              </>
            )}
            <button
              onClick={handleManualRefresh}
              title="Refresh Host Status"
              className="p-1.5 text-gray-400 hover:text-primary-400 hover:bg-surface-elevated rounded transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary-400' : ''}`} />
            </button>
          </div>
        </header>

        {/* Dynamic Page Component */}
        <main className="flex-1 overflow-y-auto p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
};
