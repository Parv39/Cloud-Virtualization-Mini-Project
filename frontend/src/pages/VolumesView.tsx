import React, { useState, useEffect } from 'react';
import { HardDrive, Plus, Trash2, Info, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { PersistentVolume } from '../types';

export const VolumesView: React.FC = () => {
  const [volumes, setVolumes] = useState<PersistentVolume[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [mountPath, setMountPath] = useState('/data');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadVolumes = async () => {
    setLoading(true);
    try {
      const data = await api.listVolumes();
      setVolumes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVolumes();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await api.createVolume(name.trim(), mountPath.trim(), description);
      setShowCreateModal(false);
      setName('');
      setDescription('');
      await loadVolumes();
    } catch (err: any) {
      setError(err.message || 'Failed to create volume');
    }
  };

  const handleDelete = async (id: number, volName: string) => {
    if (!confirm(`Are you sure you want to permanently delete volume '${volName}'? All persisted files will be destroyed.`)) return;
    try {
      await api.deleteVolume(id);
      await loadVolumes();
    } catch (err) {
      alert(`Delete failed: ${err}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">Persistent Volume Storage</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage Docker volumes to preserve files beyond the container lifecycle.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-medium shadow-md shadow-primary-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create Volume</span>
        </button>
      </div>

      {/* Educational Banner */}
      <div className="p-4 bg-surface border border-surface-border rounded-xl flex items-start space-x-3 text-xs text-gray-300">
        <Info className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">How Persistent Storage Works in DVEM:</p>
          <p className="text-gray-400 leading-relaxed">
            By default, containers use temporary writable overlay filesystems that are deleted when the container expires.
            Attaching a <strong>Persistent Volume</strong> mounts a dedicated Docker volume into the container (e.g. at <code className="text-cyan-400">/data</code>), guaranteeing your code, datasets, and files remain safely stored on your host drive even after the container is destroyed or recreated.
          </p>
        </div>
      </div>

      {/* Volumes Table */}
      <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-elevated/60 text-gray-400 uppercase tracking-wider font-semibold border-b border-surface-border">
            <tr>
              <th className="py-3 px-4">Volume Label</th>
              <th className="py-3 px-4">Docker Volume Name</th>
              <th className="py-3 px-4">Mount Target</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50 font-mono">
            {volumes.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-500 font-sans">
                  No persistent volumes registered yet. Click 'Create Volume' to provision one.
                </td>
              </tr>
            ) : (
              volumes.map((v) => (
                <tr key={v.id} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3 px-4 text-white font-bold">{v.name}</td>
                  <td className="py-3 px-4 text-cyan-400">{v.docker_volume_name}</td>
                  <td className="py-3 px-4 text-gray-300">{v.mount_path}</td>
                  <td className="py-3 px-4 text-gray-400 font-sans">{v.description || 'N/A'}</td>
                  <td className="py-3 px-4 text-gray-500 font-sans">{v.created_at?.slice(0, 10)}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(v.id, v.name)}
                      className="p-1.5 text-gray-400 hover:text-rose-400 rounded transition-colors"
                      title="Delete volume"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border p-6 rounded-xl max-w-md w-full space-y-4">
            <h4 className="font-bold text-white text-sm">Create New Docker Persistent Volume</h4>
            {error && (
              <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded text-rose-400 text-xs">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs text-gray-400 block mb-1">Volume Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                placeholder="e.g. project-data, lab-scripts"
                className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Default Mount Path in Container</label>
              <input
                type="text"
                value={mountPath}
                onChange={(e) => setMountPath(e.target.value)}
                placeholder="/data"
                className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Description (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Volume notes..."
                className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white"
              />
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
                Create Volume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
