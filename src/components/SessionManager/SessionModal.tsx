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
  const [name, setName] = useState('');
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
      setName('');
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
    const targetAlias = name.trim();
    if (!targetAlias || !host.trim() || !username.trim()) {
      setErrorMsg('Please fill in Host Alias, HostName, and Username.');
      return;
    }
    if (/\s/.test(targetAlias)) {
      setErrorMsg('Host Alias cannot contain spaces. Use hyphens or underscores (e.g. "my-server").');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    try {
      // If renaming an existing host alias, delete the old host alias first
      if (selectedId !== 'new' && selectedId !== targetAlias) {
        await onDeleteSession(selectedId);
      }

      const config: SessionConfig = {
        id: targetAlias,
        name: targetAlias,
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
    const targetAlias = name.trim() || host.trim();
    if (!targetAlias || !host.trim() || !username.trim()) {
      setErrorMsg('Host Alias, HostName, and Username are required to connect.');
      return;
    }
    if (/\s/.test(targetAlias)) {
      setErrorMsg('Host Alias cannot contain spaces. Use hyphens or underscores (e.g. "my-server").');
      return;
    }

    setIsConnecting(true);
    setErrorMsg(null);
    try {
      if (selectedId !== 'new' && selectedId !== targetAlias) {
        await onDeleteSession(selectedId);
      }

      const config: SessionConfig = {
        id: targetAlias,
        name: targetAlias,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 backdrop-blur-xs p-4 animate-pop-in">
      <div className="w-full max-w-3xl bg-white border border-pink-100 rounded-2xl shadow-2xl shadow-rose-950/10 overflow-hidden flex flex-col h-[520px]">
        {/* Header */}
        <div className="h-12 border-b border-pink-100 px-4 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-stone-800">
              <Server className="w-4 h-4 text-rose-500" />
              <span>SSH Profiles</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium border border-rose-200">
              ~/.ssh/config
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-rose-100/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body: Left sidebar (sessions list) + Right form */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Saved Sessions */}
          <div className="w-64 border-r border-pink-100 bg-[#fffbfc] flex flex-col p-3 gap-2">
            <button
              onClick={() => setSelectedId('new')}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                selectedId === 'new'
                  ? 'bg-rose-100 border-rose-300 text-rose-800 shadow-xs'
                  : 'border-pink-200/80 hover:bg-rose-50 text-stone-700'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Host Profile</span>
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
                      ? 'bg-rose-100/90 text-rose-950 border border-rose-200 font-medium shadow-xs'
                      : 'text-stone-600 hover:bg-rose-50/70 hover:text-stone-900'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: s.color || '#fb7185' }}
                    />
                    <div className="truncate">
                      <div className="truncate text-stone-800">{s.name}</div>
                      <div className="text-[10px] text-stone-400 truncate">
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
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 transition-opacity cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Form */}
          <div
            className="flex-1 p-5 overflow-y-auto space-y-4 bg-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isConnecting && !isSaving) {
                e.preventDefault();
                handleConnectClick();
              }
            }}
          >
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-xs text-stone-600 font-medium">
                  Host Alias <span className="text-stone-400 font-normal">(Host in ~/.ssh/config)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. myserver or web-prod"
                  className="w-full bg-rose-50/30 border border-pink-200/90 rounded-lg px-3 py-1.5 text-xs text-stone-800 font-mono focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-1 focus:ring-rose-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-600 font-medium">Color</label>
                <div className="flex items-center gap-1.5 pt-1">
                  {['#fb7185', '#f43f5e', '#ec4899', '#f97316', '#10b981', '#8b5cf6'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                        color === c ? 'scale-110 border-stone-800' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3 space-y-1">
                <label className="text-xs text-stone-600 font-medium">
                  HostName <span className="text-stone-400 font-normal">(Server IP or Domain)</span>
                </label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="192.168.1.100 or myserver.com"
                  className="w-full bg-rose-50/30 border border-pink-200/90 rounded-lg px-3 py-1.5 text-xs text-stone-800 font-mono focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-1 focus:ring-rose-200"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-600 font-medium">Port</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value))}
                  className="w-full bg-rose-50/30 border border-pink-200/90 rounded-lg px-3 py-1.5 text-xs text-stone-800 font-mono focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-1 focus:ring-rose-200"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-stone-600 font-medium">
                User <span className="text-stone-400 font-normal">(SSH Username)</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ubuntu / root / ec2-user"
                className="w-full bg-rose-50/30 border border-pink-200/90 rounded-lg px-3 py-1.5 text-xs text-stone-800 font-mono focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-1 focus:ring-rose-200"
              />
            </div>

            {/* Authentication Tabs */}
            <div className="space-y-2 pt-1">
              <label className="text-xs text-stone-600 font-medium">Authentication Method</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAuthType('password')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    authType === 'password'
                      ? 'bg-rose-100/90 border-rose-300 text-rose-800 font-semibold'
                      : 'border-pink-100 text-stone-500 hover:bg-rose-50/60'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuthType('private_key')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    authType === 'private_key'
                      ? 'bg-rose-100/90 border-rose-300 text-rose-800 font-semibold'
                      : 'border-pink-100 text-stone-500 hover:bg-rose-50/60'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>SSH Private Key</span>
                </button>
              </div>

              {authType === 'password' ? (
                <div className="space-y-1 pt-1">
                  <label className="text-xs text-stone-600 font-medium">Password (Stored in Apple Keychain)</label>
                  <input
                    type="password"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full bg-rose-50/30 border border-pink-200/90 rounded-lg px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-1 focus:ring-rose-200"
                  />
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="space-y-1">
                    <label className="text-xs text-stone-600 font-medium">
                      IdentityFile <span className="text-stone-400 font-normal">(Private Key File Path)</span>
                    </label>
                    <input
                      type="text"
                      value={keyPath}
                      onChange={(e) => setKeyPath(e.target.value)}
                      placeholder="~/.ssh/id_ed25519 or ~/.ssh/id_rsa"
                      className="w-full bg-rose-50/30 border border-pink-200/90 rounded-lg px-3 py-1.5 text-xs text-stone-800 font-mono focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-1 focus:ring-rose-200"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-stone-600 font-medium">Key Passphrase (Optional, Stored in Apple Keychain)</label>
                    <input
                      type="password"
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      placeholder="Passphrase if encrypted..."
                      className="w-full bg-rose-50/30 border border-pink-200/90 rounded-lg px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-1 focus:ring-rose-200"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1 pt-1">
              <label className="text-xs text-stone-600 font-medium">
                Initial Remote Directory <span className="text-stone-400 font-normal">(Default: User Home ~)</span>
              </label>
              <input
                type="text"
                value={initialPath}
                onChange={(e) => setInitialPath(e.target.value)}
                placeholder="Leave empty for User Home (~), or e.g. /var/www"
                className="w-full bg-rose-50/30 border border-pink-200/90 rounded-lg px-3 py-1.5 text-xs text-stone-800 font-mono focus:outline-none focus:border-rose-400 focus:bg-white focus:ring-1 focus:ring-rose-200"
              />
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="h-14 border-t border-pink-100 bg-rose-50/40 px-5 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-stone-500 hover:text-stone-800 hover:bg-rose-100/50 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white hover:bg-rose-50 text-stone-700 border border-pink-200 transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save'}</span>
            </button>

            <button
              onClick={handleConnectClick}
              disabled={isConnecting}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold bg-rose-400 hover:bg-rose-500 text-white shadow-md shadow-rose-200 transition-all active:scale-95 cursor-pointer"
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
