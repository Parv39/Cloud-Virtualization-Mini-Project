import React, { useState, useEffect } from 'react';
import { Layers, Download, RefreshCw, AlertCircle, HardDrive, CheckCircle } from 'lucide-react';
import { api } from '../services/api';

export const ImagesView: React.FC = () => {
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [imageName, setImageName] = useState('');
  const [tag, setTag] = useState('latest');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadImages = async () => {
    setLoading(true);
    try {
      const data = await api.listImages();
      setImages(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handlePull = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageName.trim()) return;
    setPulling(true);
    setStatusMsg(null);
    try {
      const res = await api.pullImage(imageName.trim(), tag.trim());
      setStatusMsg({ type: 'success', text: res.message });
      setImageName('');
      await loadImages();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to pull image' });
    } finally {
      setPulling(false);
    }
  };

  const quickPulls = [
    { name: 'alpine', tag: 'latest', size: '~5 MB' },
    { name: 'python', tag: '3.11-slim', size: '~140 MB' },
    { name: 'node', tag: '20-slim', size: '~180 MB' },
    { name: 'ubuntu', tag: '22.04', size: '~77 MB' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">Docker Image Repository</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Inspect locally cached container base images and pull trusted runtime images.
          </p>
        </div>
        <button
          onClick={loadImages}
          className="p-2 bg-surface-elevated hover:bg-surface-border text-gray-400 hover:text-white rounded-lg border border-surface-border"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-400' : ''}`} />
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-lg flex items-center space-x-2 text-xs border ${
            statusMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Pull Image Form Card */}
      <div className="p-5 bg-surface border border-surface-border rounded-xl space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
          <Download className="w-4 h-4 text-primary-400" />
          <span>Pull Image from Docker Hub</span>
        </h3>

        <form onSubmit={handlePull} className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={imageName}
              onChange={(e) => setImageName(e.target.value)}
              placeholder="e.g. alpine, python, node, debian"
              className="w-full px-3.5 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white font-mono focus:outline-none focus:border-primary-500"
            />
          </div>
          <div className="w-28">
            <input
              type="text"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="Tag (latest)"
              className="w-full px-3.5 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white font-mono focus:outline-none focus:border-primary-500"
            />
          </div>
          <button
            type="submit"
            disabled={pulling || !imageName.trim()}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-medium text-xs rounded-lg transition-colors disabled:opacity-40 shadow-sm"
          >
            {pulling ? 'Pulling Layer Streams...' : 'Pull Image'}
          </button>
        </form>

        <div className="flex items-center space-x-2 text-[11px] text-gray-400">
          <span className="font-semibold text-gray-500">Quick Pulls:</span>
          {quickPulls.map((qp) => (
            <button
              key={qp.name}
              onClick={() => {
                setImageName(qp.name);
                setTag(qp.tag);
              }}
              className="px-2 py-0.5 bg-surface-elevated hover:bg-surface-border text-gray-300 rounded font-mono border border-surface-border"
            >
              {qp.name}:{qp.tag} ({qp.size})
            </button>
          ))}
        </div>
      </div>

      {/* Images Table */}
      <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-elevated/60 text-gray-400 uppercase tracking-wider font-semibold border-b border-surface-border">
            <tr>
              <th className="py-3 px-4">Repository</th>
              <th className="py-3 px-4">Tag</th>
              <th className="py-3 px-4">Image ID</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50 font-mono">
            {images.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 font-sans">
                  No images found on host.
                </td>
              </tr>
            ) : (
              images.map((img, idx) => (
                <tr key={`${img.repository}-${img.tag}-${idx}`} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-3 px-4 text-white font-bold">{img.repository}</td>
                  <td className="py-3 px-4 text-cyan-400">{img.tag}</td>
                  <td className="py-3 px-4 text-gray-500">{img.id}</td>
                  <td className="py-3 px-4 text-gray-300">{img.size_mb} MB</td>
                  <td className="py-3 px-4 text-gray-500 font-sans">{img.created?.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
