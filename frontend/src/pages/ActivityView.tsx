import React, { useState, useEffect } from 'react';
import { History, RefreshCw, Search, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { ActivityLog } from '../types';

export const ActivityView: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getActivityLogs(100);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.environment_name && l.environment_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (l.details && l.details.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">Activity & Audit Logs</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Immutable audit trail of container lifecycles, automated cleanups, file operations, and resource assignments.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search audit records..."
              className="pl-8 pr-3 py-1.5 bg-surface border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-primary-500 w-52"
            />
          </div>

          <button
            onClick={loadLogs}
            className="p-1.5 bg-surface hover:bg-surface-elevated text-gray-400 hover:text-white rounded-lg border border-surface-border transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-elevated/60 text-gray-400 uppercase tracking-wider font-semibold border-b border-surface-border">
            <tr>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Environment</th>
              <th className="py-3 px-4">Details</th>
              <th className="py-3 px-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 font-sans">
                  No activity log records found.
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        log.status === 'success'
                          ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30'
                          : log.status === 'error'
                          ? 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30'
                          : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-white capitalize">
                    {log.action.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4 font-mono text-cyan-400">
                    {log.environment_name || 'System / Global'}
                  </td>
                  <td className="py-3 px-4 text-gray-300 max-w-md truncate" title={log.details || ''}>
                    {log.details || '-'}
                  </td>
                  <td className="py-3 px-4 font-mono text-gray-500 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
