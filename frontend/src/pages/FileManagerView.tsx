import React, { useState, useEffect } from 'react';
import {
  FolderTree,
  Folder,
  File,
  Upload,
  Download,
  Plus,
  Trash2,
  ChevronRight,
  ArrowUp,
  RefreshCw,
  Boxes,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { Environment, FileItem } from '../types';

interface FileManagerViewProps {
  initialEnvId?: number;
  onNavigate?: (tab: string) => void;
}

export const FileManagerView: React.FC<FileManagerViewProps> = ({ initialEnvId, onNavigate }) => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<number | undefined>(initialEnvId);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New File/Folder Modal states
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Load running environments
  useEffect(() => {
    const fetchEnvs = async () => {
      try {
        const data = await api.getEnvironments();
        const running = data.filter((e) => e.status === 'running');
        setEnvironments(running);
        
        if (running.length > 0) {
          const isStillRunning = running.some((e) => e.id === selectedEnvId);
          if (!isStillRunning) {
            setSelectedEnvId(running[0].id);
          }
        } else {
          setSelectedEnvId(undefined);
        }
      } catch (e) {
        console.error('Failed to load environments:', e);
      } finally {
        setPageLoading(false);
      }
    };
    fetchEnvs();
  }, [selectedEnvId]);

  // Load directory items
  const loadFiles = async (envId: number, path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listFiles(envId, path);
      setCurrentPath(res.current_path);
      setFiles(res.items);
    } catch (err: any) {
      setError(err.message || 'Failed to list directory contents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEnvId && environments.some((e) => e.id === selectedEnvId)) {
      loadFiles(selectedEnvId, currentPath);
    }
  }, [selectedEnvId, currentPath, environments]);

  const handleNavigateFolder = (folderName: string) => {
    const nextPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    setCurrentPath(nextPath);
  };

  const handleNavigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const upPath = parts.length === 0 ? '/' : '/' + parts.join('/');
    setCurrentPath(upPath);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !selectedEnvId) return;
    const file = e.target.files[0];
    try {
      await api.uploadFile(selectedEnvId, currentPath, file);
      await loadFiles(selectedEnvId, currentPath);
    } catch (err) {
      alert(`Upload failed: ${err}`);
    }
  };

  const handleCreateFile = async () => {
    if (!selectedEnvId || !newFileName.trim()) return;
    const filePath = currentPath === '/' ? `/${newFileName}` : `${currentPath}/${newFileName}`;
    try {
      await api.createFile(selectedEnvId, filePath, newFileContent);
      setShowNewFileModal(false);
      setNewFileName('');
      setNewFileContent('');
      await loadFiles(selectedEnvId, currentPath);
    } catch (err) {
      alert(`Failed to create file: ${err}`);
    }
  };

  const handleCreateFolder = async () => {
    if (!selectedEnvId || !newFolderName.trim()) return;
    const folderPath = currentPath === '/' ? `/${newFolderName}` : `${currentPath}/${newFolderName}`;
    try {
      await api.createFolder(selectedEnvId, folderPath);
      setShowNewFolderModal(false);
      setNewFolderName('');
      await loadFiles(selectedEnvId, currentPath);
    } catch (err) {
      alert(`Failed to create folder: ${err}`);
    }
  };

  const handleDeleteItem = async (itemPath: string) => {
    if (!selectedEnvId) return;
    if (!confirm(`Are you sure you want to delete ${itemPath}?`)) return;
    try {
      await api.deleteFile(selectedEnvId, itemPath);
      await loadFiles(selectedEnvId, currentPath);
    } catch (err) {
      alert(`Failed to delete: ${err}`);
    }
  };

  // If no running environments
  if (!pageLoading && environments.length === 0) {
    return (
      <div className="p-12 text-center bg-surface border border-surface-border rounded-xl max-w-2xl mx-auto space-y-4 my-10">
        <div className="p-3 bg-primary-600/10 text-primary-400 w-14 h-14 mx-auto rounded-2xl flex items-center justify-center">
          <FolderTree className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white tracking-wide">No Active Linux Environments Running</h3>
        <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
          The container file manager browses files directly inside an active container's virtual filesystem. Please create or start an environment first.
        </p>
        <div className="flex items-center justify-center space-x-3 pt-2">
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('create')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-primary-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>Launch New Environment</span>
              </button>
              <button
                onClick={() => onNavigate('environments')}
                className="flex items-center space-x-1.5 px-4 py-2 bg-surface-elevated hover:bg-surface-border text-gray-300 rounded-lg text-xs font-medium border border-surface-border"
              >
                <Boxes className="w-4 h-4" />
                <span>My Environments</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const pathParts = currentPath.split('/').filter(Boolean);

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-surface border border-surface-border rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-600/20 text-primary-400 rounded-lg">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Container File Manager</h3>
            <p className="text-xs text-gray-400">
              Direct, isolated access to the container's virtualized filesystem.
            </p>
          </div>
        </div>

        {/* Environment Selector and Actions */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedEnvId || ''}
            onChange={(e) => {
              setSelectedEnvId(Number(e.target.value));
              setCurrentPath('/');
            }}
            className="px-3 py-1.5 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-primary-500"
          >
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name} ({env.image})
              </option>
            ))}
          </select>

          {/* Action buttons */}
          <label className="flex items-center space-x-1.5 px-3 py-1.5 bg-primary-600/20 hover:bg-primary-600/30 text-primary-400 border border-primary-500/30 rounded-lg text-xs font-medium cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload</span>
            <input type="file" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={() => setShowNewFileModal(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-surface-elevated hover:bg-surface-border text-gray-300 rounded-lg text-xs font-medium border border-surface-border"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New File</span>
          </button>

          <button
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center space-x-1 px-3 py-1.5 bg-surface-elevated hover:bg-surface-border text-gray-300 rounded-lg text-xs font-medium border border-surface-border"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Folder</span>
          </button>

          <button
            onClick={() => selectedEnvId && loadFiles(selectedEnvId, currentPath)}
            className="p-1.5 text-gray-400 hover:text-white bg-surface-elevated rounded-lg border border-surface-border"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center space-x-2 px-4 py-2.5 bg-surface-elevated/40 border border-surface-border rounded-lg text-xs font-mono">
        <button
          onClick={handleNavigateUp}
          disabled={currentPath === '/'}
          className="p-1 text-gray-400 hover:text-white disabled:opacity-30 mr-1"
          title="Go to parent directory"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setCurrentPath('/')}
          className="text-primary-400 hover:underline font-bold"
        >
          /
        </button>

        {pathParts.map((part, index) => {
          const subPath = '/' + pathParts.slice(0, index + 1).join('/');
          const isLast = index === pathParts.length - 1;
          return (
            <React.Fragment key={subPath}>
              <ChevronRight className="w-3 h-3 text-gray-600" />
              <button
                onClick={() => setCurrentPath(subPath)}
                className={isLast ? 'text-white font-bold' : 'text-gray-400 hover:underline'}
              >
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center space-x-2 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Files Table */}
      <div className="bg-surface border border-surface-border rounded-xl overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-elevated/60 text-gray-400 uppercase tracking-wider font-semibold border-b border-surface-border">
            <tr>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Size</th>
              <th className="py-3 px-4">Permissions</th>
              <th className="py-3 px-4">Modified</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border/50 font-mono">
            {files.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 font-sans">
                  Empty directory or no access.
                </td>
              </tr>
            ) : (
              files.map((item) => (
                <tr key={item.path} className="hover:bg-surface-elevated/40 transition-colors">
                  <td className="py-2.5 px-4">
                    {item.is_dir ? (
                      <button
                        onClick={() => handleNavigateFolder(item.name)}
                        className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 font-medium"
                      >
                        <Folder className="w-4 h-4 text-cyan-400 fill-cyan-400/20" />
                        <span>{item.name}</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2 text-gray-200">
                        <File className="w-4 h-4 text-gray-400" />
                        <span>{item.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-gray-400">
                    {item.is_dir ? '-' : `${item.size} B`}
                  </td>
                  <td className="py-2.5 px-4 text-gray-500">{item.permissions}</td>
                  <td className="py-2.5 px-4 text-gray-400">{item.modified}</td>
                  <td className="py-2.5 px-4 text-right space-x-2">
                    {!item.is_dir && selectedEnvId && (
                      <a
                        href={api.getDownloadUrl(selectedEnvId, item.path)}
                        download
                        className="inline-block p-1 text-gray-400 hover:text-primary-400"
                        title="Download file"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteItem(item.path)}
                      className="p-1 text-gray-400 hover:text-rose-400"
                      title="Delete item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border p-6 rounded-xl max-w-md w-full space-y-4">
            <h4 className="font-bold text-white text-sm">Create New Text File in {currentPath}</h4>
            <div>
              <label className="text-xs text-gray-400 block mb-1">File Name</label>
              <input
                type="text"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="e.g. script.py, test.txt"
                className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Initial Content</label>
              <textarea
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                rows={5}
                placeholder="Enter initial file text..."
                className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowNewFileModal(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFile}
                className="px-4 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface border border-surface-border p-6 rounded-xl max-w-sm w-full space-y-4">
            <h4 className="font-bold text-white text-sm">Create Directory in {currentPath}</h4>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Folder Name</label>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="e.g. src, logs, my_project"
                className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                className="px-4 py-1.5 text-xs bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
