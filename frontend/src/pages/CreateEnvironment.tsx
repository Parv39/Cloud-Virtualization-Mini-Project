import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Terminal,
  Cpu,
  Clock,
  HardDrive,
  Network,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { EnvironmentCreate, PersistentVolume, DockerNetwork, TemplateInfo } from '../types';

interface CreateEnvironmentProps {
  onSuccess: (envId: number) => void;
  onCancel: () => void;
}

export const CreateEnvironment: React.FC<CreateEnvironmentProps> = ({ onSuccess, onCancel }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [templateType, setTemplateType] = useState('ubuntu');
  const [name, setName] = useState(`env-${Math.floor(1000 + Math.random() * 9000)}`);
  const [description, setDescription] = useState('');
  const [ramMb, setRamMb] = useState(512);
  const [cpuLimit, setCpuLimit] = useState(0.5);
  const [expirationMinutes, setExpirationMinutes] = useState(180); // Default to 3 hours for generous lab time
  const [selectedVolume, setSelectedVolume] = useState<string>('');
  const [volumeMountPath, setVolumeMountPath] = useState<string>('/data');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('bridge');

  // Loaded Options
  const [volumes, setVolumes] = useState<PersistentVolume[]>([]);
  const [networks, setNetworks] = useState<DockerNetwork[]>([]);
  const [templates, setTemplates] = useState<Record<string, TemplateInfo>>({});

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [vols, nets, tmpls] = await Promise.all([
          api.listVolumes(),
          api.listNetworks(),
          api.getTemplates()
        ]);
        setVolumes(vols);
        setNetworks(nets);
        setTemplates(tmpls);
      } catch (e) {
        console.error('Failed to load options:', e);
      }
    };
    fetchOptions();
  }, []);

  const templateOptions = [
    {
      id: 'ubuntu',
      title: 'Ubuntu Linux',
      version: '22.04 LTS',
      image: 'ubuntu:22.04',
      badge: 'Official',
      desc: 'Full-featured Ubuntu Linux environment with standard utilities and APT package manager.',
      features: ['Bash 5.1', 'APT package manager', 'Coreutils', 'Network tools']
    },
    {
      id: 'python',
      title: 'Python Development',
      version: 'Python 3.11',
      image: 'python:3.11-slim',
      badge: 'Dev Stack',
      desc: 'Python runtime environment with pip package manager preinstalled for quick scripting and testing.',
      features: ['Python 3.11', 'pip preinstalled', 'venv module', 'Standard libraries']
    },
    {
      id: 'nodejs',
      title: 'Node.js Development',
      version: 'Node.js 20 LTS',
      image: 'node:20-slim',
      badge: 'Dev Stack',
      desc: 'Node.js 20 LTS runtime environment with npm preinstalled for JavaScript execution.',
      features: ['Node.js 20', 'npm preinstalled', 'V8 engine', 'ESM support']
    },
    {
      id: 'alpine',
      title: 'Lightweight Alpine Linux',
      version: 'Alpine 3.19',
      image: 'alpine:latest',
      badge: 'Micro (~5MB)',
      desc: 'Super-fast lightweight Linux image with busybox utilities and apk package manager.',
      features: ['BusyBox shell', 'apk package manager', 'Low memory footprint', 'Fast spin-up']
    }
  ];

  const handleDeploy = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload: EnvironmentCreate = {
        name,
        template_type: templateType,
        cpu_limit: cpuLimit,
        ram_limit_mb: ramMb,
        expiration_minutes: expirationMinutes === -1 ? 0 : expirationMinutes,
        auto_cleanup: expirationMinutes > 0,
        description,
        volume_name: selectedVolume || undefined,
        volume_mount_path: selectedVolume ? volumeMountPath : undefined,
        network_name: selectedNetwork || 'bridge'
      };

      const result = await api.createEnvironment(payload);
      onSuccess(result.id);
    } catch (err: any) {
      setError(err.message || 'Failed to create container');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="border-b border-surface-border pb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white tracking-wide">Create Disposable Virtual Environment</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Step {step} of 4: {step === 1 && 'Select Environment Template'}
            {step === 2 && 'Name & Identity'}
            {step === 3 && 'Resource Allocation & Storage'}
            {step === 4 && 'Review & Deploy Container'}
          </p>
        </div>

        {/* Step Indicator Pills */}
        <div className="flex items-center space-x-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-7 h-1.5 rounded-full transition-all ${
                s === step
                  ? 'bg-primary-500 w-9'
                  : s < step
                  ? 'bg-primary-500/40'
                  : 'bg-surface-elevated'
              }`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center space-x-2 text-rose-400 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Select Template */}
      {step === 1 && (
        <div className="space-y-4">
          <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Choose Base Runtime Image
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templateOptions.map((tmpl) => {
              const isSelected = templateType === tmpl.id;
              return (
                <div
                  key={tmpl.id}
                  onClick={() => setTemplateType(tmpl.id)}
                  className={`p-5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary-950/20 border-primary-500 shadow-md ring-1 ring-primary-500/50'
                      : 'bg-surface border-surface-border hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-white">{tmpl.title}</h4>
                      <p className="text-xs text-primary-400 font-mono mt-0.5">{tmpl.version}</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-surface-elevated text-gray-300 border border-surface-border">
                      {tmpl.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">{tmpl.desc}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {tmpl.features.map((feat) => (
                      <span
                        key={feat}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated/70 text-gray-400"
                      >
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2: Environment Identity */}
      {step === 2 && (
        <div className="p-6 bg-surface border border-surface-border rounded-xl space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
              Environment Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
              placeholder="e.g. test-python-lab"
              className="w-full px-3.5 py-2.5 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white font-mono focus:outline-none focus:border-primary-500 transition-colors"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              Alphanumeric characters, dashes, and underscores only. Must be unique.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5">
              Description / Notes (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of what this disposable container will be used for..."
              rows={3}
              className="w-full px-3.5 py-2.5 bg-surface-elevated border border-surface-border rounded-lg text-sm text-white focus:outline-none focus:border-primary-500 transition-colors"
            />
          </div>
        </div>
      )}

      {/* Step 3: Resources & Storage */}
      {step === 3 && (
        <div className="space-y-5">
          {/* Resource Constraints Card */}
          <div className="p-6 bg-surface border border-surface-border rounded-xl space-y-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Container Resource Constraints (Cgroups v2)</span>
            </h3>

            {/* RAM Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-300 font-medium">Memory Allocation (RAM):</span>
                <span className="text-cyan-400 font-mono font-bold">{ramMb} MB ({ (ramMb / 1024).toFixed(2) } GB)</span>
              </div>
              <input
                type="range"
                min={256}
                max={4096}
                step={256}
                value={ramMb}
                onChange={(e) => setRamMb(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>256 MB (Micro)</span>
                <span>512 MB (Default)</span>
                <span>1024 MB</span>
                <span>2048 MB</span>
                <span>4096 MB (Max)</span>
              </div>
            </div>

            {/* CPU Limit */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-300 font-medium">CPU Core Allocation:</span>
                <span className="text-blue-400 font-mono font-bold">{cpuLimit} Cores</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={2.0}
                step={0.1}
                value={cpuLimit}
                onChange={(e) => setCpuLimit(Number(e.target.value))}
                className="w-full accent-blue-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                <span>0.2 CPU</span>
                <span>0.5 CPU (Default)</span>
                <span>1.0 CPU</span>
                <span>1.5 CPU</span>
                <span>2.0 CPU</span>
              </div>
            </div>
          </div>

          {/* Expiration Card */}
          <div className="p-6 bg-surface border border-surface-border rounded-xl space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Automatic Cleanup & Expiration</span>
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              {[
                { label: '15 Minutes', val: 15 },
                { label: '30 Minutes', val: 30 },
                { label: '1 Hour (Default)', val: 60 },
                { label: '3 Hours', val: 180 },
                { label: 'No Expiration', val: -1 },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setExpirationMinutes(opt.val)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-medium border text-center transition-all ${
                    expirationMinutes === opt.val
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-surface-elevated text-gray-400 border-surface-border hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-500">
              When expired, DVEM automatically stops and removes the container. Attached volumes remain preserved.
            </p>
          </div>

          {/* Storage & Network Card */}
          <div className="p-6 bg-surface border border-surface-border rounded-xl space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300 flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-primary-400" />
              <span>Optional Persistent Volume & Network</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Persistent Volume</label>
                <select
                  value={selectedVolume}
                  onChange={(e) => setSelectedVolume(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white"
                >
                  <option value="">None (Temporary Container Storage)</option>
                  {volumes.map((v) => (
                    <option key={v.id} value={v.docker_volume_name}>
                      {v.name} ({v.docker_volume_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Virtual Network</label>
                <select
                  value={selectedNetwork}
                  onChange={(e) => setSelectedNetwork(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white"
                >
                  <option value="bridge">bridge (Default Isolated Host Bridge)</option>
                  {networks.map((n) => (
                    <option key={n.id} value={n.name}>
                      {n.name} ({n.driver})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review & Deploy */}
      {step === 4 && (
        <div className="p-6 bg-surface border border-surface-border rounded-xl space-y-5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
            Review Environment Configuration
          </h3>

          <div className="divide-y divide-surface-border/60 text-xs">
            <div className="py-2.5 flex justify-between">
              <span className="text-gray-400">Environment Name:</span>
              <span className="text-white font-mono font-bold">{name}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-gray-400">Template / Image:</span>
              <span className="text-cyan-400 font-mono">
                {templateOptions.find((t) => t.id === templateType)?.image}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-gray-400">Memory Allocation (RAM):</span>
              <span className="text-white font-mono">{ramMb} MB</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-gray-400">CPU Allocation:</span>
              <span className="text-white font-mono">{cpuLimit} Cores</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-gray-400">Expiration Cleanup:</span>
              <span className="text-emerald-400 font-mono">
                {expirationMinutes === -1 ? 'Disabled' : `${expirationMinutes} Minutes`}
              </span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-gray-400">Storage Volume:</span>
              <span className="text-gray-300 font-mono">{selectedVolume || 'Ephemeral Container Overlay'}</span>
            </div>
            <div className="py-2.5 flex justify-between">
              <span className="text-gray-400">Docker Network:</span>
              <span className="text-gray-300 font-mono">{selectedNetwork}</span>
            </div>
          </div>

          <div className="p-3.5 bg-primary-950/20 border border-primary-500/30 rounded-lg text-xs text-primary-300 flex items-start space-x-2.5">
            <Sparkles className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
            <p>
              Clicking <strong>Deploy Environment</strong> will invoke the Docker Engine API to create, configure cgroups v2 limits, attach virtual network interfaces, and launch the genuine Linux container immediately.
            </p>
          </div>
        </div>
      )}

      {/* Wizard Footer Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-border">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={loading}
            className="flex items-center space-x-1.5 px-4 py-2 bg-surface-elevated hover:bg-surface-border text-gray-300 rounded-lg text-xs font-medium"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-400 hover:text-white text-xs font-medium"
          >
            Cancel
          </button>
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={() => {
              if (step === 2 && !name.trim()) {
                setError('Environment name is required');
                return;
              }
              setError(null);
              setStep(step + 1);
            }}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-primary-600/20"
          >
            <span>Next Step</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDeploy}
            disabled={loading}
            className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? 'Provisioning Container...' : 'Deploy Environment'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
