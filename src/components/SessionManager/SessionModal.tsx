import React, { useState, useEffect } from 'react';
import {
  X,
  Server,
  Plus,
  Trash2,
  Key,
  Lock,
  AlertCircle,
  Play,
  Save,
} from 'lucide-react';
import { AuthType, SessionConfig } from '../../types';

interface SessionModalProps {
  isOpen: boolean;
  sessions: SessionConfig[];
  initialSessionId?: string;
  onClose: () => void;
  onSaveSession: (session: SessionConfig, secret?: string) => Promise<void>;
  onDeleteSession: (sessionId: string) => Promise<void>;
  onConnect: (session: SessionConfig, secret?: string) => Promise<void>;
  onGetSecret: (sessionId: string) => Promise<string | null>;
}

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  sessions,
  initialSessionId,
  onClose,
  onSaveSession,
  onDeleteSession,
  onConnect,
  onGetSecret,
}) => {
  const [selectedId, setSelectedId] = useState<string>(() => {
    if (initialSessionId && sessions.some((s) => s.id === initialSessionId)) {
      return initialSessionId;
    }
    if (sessions.length > 0) {
      return sessions[sessions.length - 1].id;
    }
    return 'new';
  });
  const [name, setName] = useState('New Session');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [username, setUsername] = useState('root');
  const [authType, setAuthType] = useState<AuthType>('password');
  const [secret, setSecret] = useState('');
  const [keyPath, setKeyPath] = useState('');
  const [initialPath, setInitialPath] = useState('');
  const [color, setColor] = useState('#38bdf8');
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const prevIsOpenRef = React.useRef(isOpen);

  // When modal transitions from closed to open, reset selection to last connected / initial session
  useEffect(() => {
    if (!prevIsOpenRef.current && isOpen) {
      if (initialSessionId && sessions.some((s) => s.id === initialSessionId)) {
        setSelectedId(initialSessionId);
      } else if (sessions.length > 0) {
        setSelectedId(sessions[sessions.length - 1].id);
      } else {
        setSelectedId('new');
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, initialSessionId, sessions]);

  // If currently selected session was deleted while modal is open, fallback safely
  useEffect(() => {
    if (!isOpen) return;
    if (selectedId !== 'new' && !sessions.some((s) => s.id === selectedId)) {
      if (sessions.length > 0) {
        setSelectedId(sessions[sessions.length - 1].id);
      } else {
        setSelectedId('new');
      }
    }
  }, [sessions, isOpen, selectedId]);

  // When selectedId changes or modal opens, populate form fields
  useEffect(() => {
    if (!isOpen) return;

    if (selectedId === 'new') {
      setName('New Session');
      setHost('');
      setPort(22);
      setUsername('root');
      setAuthType('password');
      setSecret('');
      setKeyPath('');
      setInitialPath('');
      setColor('#38bdf8');
      setErrorMsg(null);
    } else {
      const existing = sessions.find((s) => s.id === selectedId);
      if (existing) {
        setName(existing.name);
        setHost(existing.host);
        setPort(existing.port);
        setUsername(existing.username);
        setAuthType(existing.auth_type);
        setKeyPath(existing.key_path || '');
        setInitialPath(existing.initial_remote_path || '');
        setColor(existing.color || '#38bdf8');
        setErrorMsg(null);

        // Fetch stored password/passphrase
        onGetSecret(existing.id).then((pwd) => {
          setSecret(pwd || '');
        });
      }
    }
  }, [selectedId, isOpen, sessions, onGetSecret]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim() || !host.trim() || !username.trim()) {
      setErrorMsg('Please fill in Session Name, Host, and Username.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      const config: SessionConfig = {
        id: selectedId === 'new' ? crypto.randomUUID() : selectedId,
        name: name.trim(),
        host: host.trim(),
        port: Number(port) || 22,
        username: username.trim(),
        auth_type: authType,
        key_path: authType === 'private_key' ? keyPath.trim() : undefined,
        initial_remote_path: initialPath.trim() || undefined,
        color,
        created_at: Date.now(),
      };

      await onSaveSession(config, secret);
      setSelectedId(config.id);
    } catch (e: any) {
      setErrorMsg(e.toString());
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectClick = async () => {
    if (!host.trim() || !username.trim()) {
      setErrorMsg('Host and Username are required to connect.');
      return;
    }

    setIsConnecting(true);
    setErrorMsg(null);
    try {
      const config: SessionConfig = {
        id: selectedId === 'new' ? crypto.randomUUID() : selectedId,
        name: name.trim() || host.trim(),
        host: host.trim(),
        port: Number(port) || 22,
        username: username.trim(),
        auth_type: authType,
        key_path: authType === 'private_key' ? keyPath.trim() : undefined,
        initial_remote_path: initialPath.trim() || undefined,
        color,
        created_at: Date.now(),
      };

      // Save before connecting
      await onSaveSession(config, secret);
      await onConnect(config, secret);
      onClose();
    } catch (e: any) {
      setErrorMsg(e.toString());
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-pop-in">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[520px]">
        {/* Header */}
        <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2 font-semibold text-sm text-slate-100">
            <Server className="w-4 h-4 text-sky-400" />
            <span>Session Manager</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Left sidebar (sessions list) + Right form */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Saved Sessions */}
          <div className="w-64 border-r border-slate-800 bg-slate-950/20 flex flex-col p-3 gap-2">
            <button
              onClick={() => setSelectedId('new')}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border transition-all ${
                selectedId === 'new'
                  ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                  : 'border-slate-700 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Connection</span>
            </button>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  onDoubleClick={() => {
                    setSelectedId(s.id);
                    handleConnectClick();
                  }}
                  title="Click to select, double-click to connect"
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer group transition-colors ${
                    selectedId === s.id
                      ? 'bg-slate-800 text-white border border-slate-700 font-medium'
                      : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color || '#38bdf8' }}
                    />
                    <div className="truncate">
                      <div className="truncate text-slate-200">{s.name}</div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {s.username}@{s.host}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(s.id);
                    }}
                    title="Delete session"
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div
            className="flex-1 p-5 overflow-y-auto space-y-4"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isConnecting && !isSaving) {
                e.preventDefault();
                handleConnectClick();
              }
            }}
          >
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-slate-400 font-medium">Session Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. AWS Production"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Color</label>
                <div className="flex items-center gap-1.5 pt-1">
                  {['#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        color === c ? 'scale-110 border-white' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3 space-y-1">
                <label className="text-xs text-slate-400 font-medium">Host / IP</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.1.100 or myserver.com"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ubuntu / root / ec2-user"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Authentication Tabs */}
            <div className="space-y-2 pt-1">
              <label className="text-xs text-slate-400 font-medium">Authentication Method</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthType('password')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                    authType === 'password'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                      : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthType('private_key')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                    authType === 'private_key'
                      ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                      : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>SSH Private Key</span>
                </button>
              </div>

              {authType === 'password' ? (
                <div className="space-y-1 pt-1">
                  <label className="text-xs text-slate-400 font-medium">Password (Stored in Keychain)</label>
                  <input
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Private Key File Path</label>
                    <input
                      type="text"
                      value={keyPath}
                      onChange={(e) => setKeyPath(e.target.value)}
                      placeholder="/Users/username/.ssh/id_rsa or id_ed25519"
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Key Passphrase (Optional)</label>
                    <input
                      type="password"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      placeholder="Passphrase if encrypted..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-xs text-slate-400 font-medium">
                Initial Remote Directory <span className="text-slate-500 font-normal">(Default: User Home ~)</span>
              </label>
              <input
                type="text"
                value={initialPath}
                onChange={(e) => setInitialPath(e.target.value)}
                placeholder="Leave empty for User Home (~), or e.g. /var/www"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="h-14 border-t border-slate-800 bg-slate-950/40 px-5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>

            <button
              onClick={handleConnectClick}
              disabled={isConnecting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20 transition-all active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>{isConnecting ? 'Connecting...' : 'Connect'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
