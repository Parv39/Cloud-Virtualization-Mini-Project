import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import {
  Terminal as TerminalIcon,
  RotateCw,
  Trash2,
  Maximize2,
  Minimize2,
  Boxes,
  Circle,
  Plus,
  Play
} from 'lucide-react';
import { api } from '../services/api';
import { Environment } from '../types';

interface TerminalViewProps {
  initialEnvId?: number;
  onNavigate?: (tab: string) => void;
}

export const TerminalView: React.FC<TerminalViewProps> = ({ initialEnvId, onNavigate }) => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvId, setSelectedEnvId] = useState<number | undefined>(initialEnvId);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermInstance = useRef<XTerm | null>(null);
  const fitAddonInstance = useRef<FitAddon | null>(null);
  const wsInstance = useRef<WebSocket | null>(null);

  // Load environments
  useEffect(() => {
    const fetchEnvs = async () => {
      try {
        const envs = await api.getEnvironments();
        const running = envs.filter((e) => e.status === 'running');
        setEnvironments(running);
        
        // If current selectedEnvId is not running or undefined, select first running env
        if (running.length > 0) {
          const isStillRunning = running.some((e) => e.id === selectedEnvId);
          if (!isStillRunning) {
            setSelectedEnvId(running[0].id);
          }
        } else {
          setSelectedEnvId(undefined);
        }
      } catch (err) {
        console.error('Failed to load environments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEnvs();
  }, [selectedEnvId]);

  // Initialize and connect terminal only if valid running container selected
  useEffect(() => {
    if (!selectedEnvId || !terminalRef.current) return;

    // Verify selected environment is actually in running list
    const isTargetRunning = environments.some((e) => e.id === selectedEnvId);
    if (!isTargetRunning) return;

    // Clean up previous session
    if (wsInstance.current) {
      wsInstance.current.close();
      wsInstance.current = null;
    }
    if (xtermInstance.current) {
      xtermInstance.current.dispose();
      xtermInstance.current = null;
    }

    // Create xterm
    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "'Fira Code', 'Courier New', monospace",
      fontSize: 14,
      lineHeight: 1.2,
      theme: {
        background: '#0B0F19',
        foreground: '#E2E8F0',
        cursor: '#06B6D4',
        selectionBackground: 'rgba(6, 182, 212, 0.3)',
        black: '#1F2937',
        red: '#EF4444',
        green: '#10B981',
        yellow: '#F59E0B',
        blue: '#3B82F6',
        magenta: '#8B5CF6',
        cyan: '#06B6D4',
        white: '#F9FAFB',
        brightBlack: '#4B5563',
        brightRed: '#F87171',
        brightGreen: '#34D399',
        brightYellow: '#FBBF24',
        brightBlue: '#60A5FA',
        brightMagenta: '#A78BFA',
        brightCyan: '#22D3EE',
        brightWhite: '#FFFFFF',
      },
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonInstance.current = fitAddon;

    // Connect WebSocket
    setConnectionStatus('connecting');
    const wsUrl = api.getTerminalWsUrl(selectedEnvId);
    const ws = new WebSocket(wsUrl);
    ws.binaryType = 'arraybuffer';
    wsInstance.current = ws;

    ws.onopen = () => {
      setConnectionStatus('connected');
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
      }
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        term.write(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        const text = new TextDecoder().decode(event.data);
        term.write(text);
      }
    };

    ws.onclose = () => {
      setConnectionStatus('disconnected');
      term.write('\r\n\x1b[33m[DVEM]: Terminal session disconnected.\x1b[0m\r\n');
    };

    ws.onerror = () => {
      setConnectionStatus('disconnected');
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      term.dispose();
    };
  }, [selectedEnvId, environments]);

  const handleReconnect = () => {
    if (!selectedEnvId) return;
    const current = selectedEnvId;
    setSelectedEnvId(undefined);
    setTimeout(() => setSelectedEnvId(current), 100);
  };

  const handleClear = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
    }
  };

  const executeSnippet = (cmd: string) => {
    if (wsInstance.current && wsInstance.current.readyState === WebSocket.OPEN) {
      wsInstance.current.send(cmd + '\n');
    }
  };

  const selectedEnv = environments.find((e) => e.id === selectedEnvId);

  const commandShortcuts = [
    { label: 'System Info', cmd: 'uname -a && cat /etc/os-release' },
    { label: 'Check Memory', cmd: 'free -m' },
    { label: 'Disk Space', cmd: 'df -h' },
    { label: 'List Files', cmd: 'ls -la' },
    { label: 'Create Project Dir', cmd: 'mkdir -p MCA_Project && cd MCA_Project && touch demo.txt && echo "Hello Virtualization" > demo.txt && cat demo.txt' },
    { label: 'Python Version', cmd: 'python3 --version 2>/dev/null || python --version 2>/dev/null' },
    { label: 'Node Version', cmd: 'node --version 2>/dev/null' },
    { label: 'Network Interfaces', cmd: 'ip a 2>/dev/null || ifconfig 2>/dev/null' }
  ];

  // If no running environments exist
  if (!loading && environments.length === 0) {
    return (
      <div className="p-12 text-center bg-surface border border-surface-border rounded-xl max-w-2xl mx-auto space-y-4 my-10">
        <div className="p-3 bg-primary-600/10 text-primary-400 w-14 h-14 mx-auto rounded-2xl flex items-center justify-center">
          <TerminalIcon className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-white tracking-wide">No Active Linux Environments Running</h3>
        <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
          The interactive terminal requires an active, running Linux container. Either your previous environment expired or none has been launched yet.
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

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-background p-4' : ''}`}>
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-surface border border-surface-border rounded-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-600/20 text-primary-400 rounded-lg">
            <TerminalIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">Interactive Linux Terminal</h3>
            <div className="flex items-center space-x-2 text-xs text-gray-400 mt-0.5">
              <span className="flex items-center space-x-1">
                <Circle
                  className={`w-2 h-2 fill-current ${
                    connectionStatus === 'connected'
                      ? 'text-emerald-400'
                      : connectionStatus === 'connecting'
                      ? 'text-amber-400 animate-pulse'
                      : 'text-rose-500'
                  }`}
                />
                <span className="capitalize">{connectionStatus}</span>
              </span>
              <span>•</span>
              <span className="font-mono text-gray-300">
                {selectedEnv ? `${selectedEnv.name} (${selectedEnv.image})` : 'Select an environment'}
              </span>
            </div>
          </div>
        </div>

        {/* Environment Selector and Actions */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedEnvId || ''}
            onChange={(e) => setSelectedEnvId(Number(e.target.value))}
            className="px-3 py-1.5 bg-surface-elevated border border-surface-border rounded-lg text-xs text-white focus:outline-none focus:border-primary-500"
          >
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name} ({env.image})
              </option>
            ))}
          </select>

          <button
            onClick={handleReconnect}
            title="Reconnect Terminal"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-surface-elevated rounded-lg transition-colors border border-surface-border"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            title="Clear Terminal Screen"
            className="p-1.5 text-gray-400 hover:text-white hover:bg-surface-elevated rounded-lg transition-colors border border-surface-border"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-surface-elevated rounded-lg transition-colors border border-surface-border"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Quick Command Shortcuts Toolbar */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0 mr-1">
          Quick Commands:
        </span>
        {commandShortcuts.map((sc) => (
          <button
            key={sc.label}
            onClick={() => executeSnippet(sc.cmd)}
            disabled={connectionStatus !== 'connected'}
            className="px-2.5 py-1 bg-surface-elevated/70 hover:bg-surface-elevated text-gray-300 hover:text-primary-400 rounded-md border border-surface-border text-[11px] font-mono whitespace-nowrap transition-colors disabled:opacity-40"
          >
            {sc.label}
          </button>
        ))}
      </div>

      {/* Terminal Container */}
      <div
        className={`bg-background border border-surface-border rounded-xl p-3 shadow-inner ${
          isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[540px]'
        }`}
      >
        <div ref={terminalRef} className="w-full h-full" />
      </div>
    </div>
  );
};
