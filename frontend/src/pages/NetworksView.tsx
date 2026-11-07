import React, { useState, useEffect } from 'react';
import { Network, Plus, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { DockerNetwork } from '../types';

export const NetworksView: React.FC = () => {
  const [networks, setNetworks] = useState<DockerNetwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [driver, setDriver] = useState('bridge');
  const [error, setError] = useState<string | null>(null);

  const loadNetworks = async () => {
    setLoading(true);
    try {
      const data = await api.listNetworks();
      setNetworks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNetworks();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await api.createNetwork(name.trim(), driver);
      setShowCreateModal(false);
      setName('');
      await loadNetworks();
    } catch (err: any) {
      setError(err.message || 'Failed to create network');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">Virtual Docker Networks</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage software-defined bridge networks for isolated container-to-container communication.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-medium shadow-md shadow-primary-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Network</span>
        </button>
      </div>

      {/* Educational Banner */}
      <div className="p-4 bg-surface border border-surface-border rounded-xl flex items-start space-x-3 text-xs text-gray-300">
        <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">Docker Virtual Bridge Networking:</p>
          <p className="text-gray-400 leading-relaxed">
            Docker creates isolated virtual Ethernet pair devices (<code className="text-cyan-400">veth</code>) connecting each container's network namespace to an internal software bridge. Containers connected to the same custom bridge network can resolve and communicate with each other securely using internal DNS, while remaining isolated from other networks and host ports.
          </p>
        </div>
      </div>

      {/* Networks Table */}
      <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-elevated/60 text-gray-400 uppercase tracking-wider font-semibold border-b border-surface-border">
            <tr>
              <th className="py-3 px-4">Network Name</th>
              <th className="py-3 px-4">Network ID</th>
              <th className="py-3 px-4">Driver</th>
              <th className="py-3 px-4">Subnet</th>
              <th className="py-3 px-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50 font-mono">
            {networks.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 font-sans">
                  No custom networks registered yet. Default bridge network is used for containers.
                </td>
              </tr>
            ) : (
              networks.map((n) => (
                <tr key={n.id} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3 px-4 text-white font-bold">{n.name}</td>
                  <td className="py-3 px-4 text-cyan-400">{n.docker_network_id}</td>
                  <td className="py-3 px-4 text-gray-300">{n.driver}</td>
                  <td className="py-3 px-4 text-gray-400">{n.subnet || 'Dynamic (172.x)'}</td>
                  <td className="py-3 px-4 text-gray-500 font-sans">{n.created_at?.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border p-6 rounded-xl max-w-sm w-full space-y-4">
            <h4 className="font-bold text-white text-sm">Create Isolated Virtual Network</h4>
            {error && (
              <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400 text-xs">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Network Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="e.g. internal-net, dev-cluster"
                className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Network Driver</label>
              <select
                value={driver}
                onChange={(e) => setDriver(e.target.value)}
                className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white"
              >
                <option value="bridge">bridge (Standard Virtual Switch)</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-4 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium"
              >
                Create Network
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
