import { useState, useEffect, useCallback } from 'react';
import { listen } from '@tauri-apps/api/event';
import {
  PlatformInfo,
  SessionConfig,
  FileItem,
  TransferTask,
  DriveInfo,
} from './types';
import { ipc } from './utils/ipc';
import { TitleBar } from './components/TitleBar';
import { FilePane } from './components/DualPane/FilePane';
import { SessionModal } from './components/SessionManager/SessionModal';
import { QueueDrawer } from './components/TransferQueue/QueueDrawer';
import { ChmodModal } from './components/Modals/ChmodModal';
import { NewFolderModal } from './components/Modals/NewFolderModal';
import { DeleteConfirmModal } from './components/Modals/DeleteConfirmModal';
import { RenameModal } from './components/Modals/RenameModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { Server, Zap } from 'lucide-react';

export function App() {
  // Platform & Environment
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [drives, setDrives] = useState<DriveInfo[]>([]);

  // Session & Connection
  const [sessions, setSessions] = useState<SessionConfig[]>([]);
  const [activeSession, setActiveSession] = useState<SessionConfig | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSessionId, setLastSessionId] = useState<string>(() => {
    try {
      return (
        localStorage.getItem('mochiscp_last_session_id') ||
        localStorage.getItem('skyscp_last_session_id') ||
        ''
      );
    } catch {
      return '';
    }
  });

  // Local Pane State
  const [localPath, setLocalPath] = useState<string>('');
  const [localItems, setLocalItems] = useState<FileItem[]>([]);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [localShowHidden, setLocalShowHidden] = useState(true);

  // Remote Pane State
  const [remotePath, setRemotePath] = useState<string>('~');
  const [remoteItems, setRemoteItems] = useState<FileItem[]>([]);
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [remoteShowHidden, setRemoteShowHidden] = useState(true);

  // Transfers & Queue
  const [transfers, setTransfers] = useState<TransferTask[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  // Modals
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [chmodTarget, setChmodTarget] = useState<FileItem | null>(null);
  const [newFolderTarget, setNewFolderTarget] = useState<{ isRemote: boolean; parentPath: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ items: FileItem[]; isRemote: boolean } | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ item: FileItem; isRemote: boolean } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Initialize platform info, drives, and local directory
  useEffect(() => {
    async function init() {
      try {
        const plat = await ipc.getPlatformInfo();
        setPlatform(plat);
        setLocalPath(plat.home_dir);

        const drvs = await ipc.getLocalDrives();
        setDrives(drvs);

        const savedSessions = await ipc.listSessions();
        setSessions(savedSessions);
      } catch (e: any) {
        console.error('Init error:', e);
      }
    }
    init();
  }, []);

  // Load Local Directory
  const loadLocalDirectory = useCallback(
    async (path: string) => {
      if (!path) return;
      setIsLocalLoading(true);
      try {
        const items = await ipc.readLocalDir(path, localShowHidden);
        setLocalItems(items);
        setLocalPath(path);
      } catch (e: any) {
        addToast('error', `Failed to read local dir: ${e}`);
      } finally {
        setIsLocalLoading(false);
      }
    },
    [localShowHidden, addToast]
  );

  useEffect(() => {
    if (localPath) {
      loadLocalDirectory(localPath);
    }
  }, [localPath, localShowHidden, loadLocalDirectory]);

  // Load Remote Directory
  const loadRemoteDirectory = useCallback(
    async (rawPath: string) => {
      if (!activeSession || !isConnected) return;
      setIsRemoteLoading(true);
      try {
        let path = rawPath;
        if (!path || path === '~' || path === '.') {
          try {
            path = await ipc.getRemoteHome(activeSession.id);
          } catch {
            path = '/';
          }
        }

        const items = await ipc.readRemoteDir(activeSession.id, path, remoteShowHidden);
        setRemoteItems(items);
        setRemotePath(path);
      } catch (e: any) {
        addToast('error', `Failed to read remote dir: ${e}`);
      } finally {
        setIsRemoteLoading(false);
      }
    },
    [activeSession, isConnected, remoteShowHidden, addToast]
  );

  useEffect(() => {
    if (isConnected && activeSession) {
      loadRemoteDirectory(remotePath);
    }
  }, [remotePath, remoteShowHidden, isConnected, activeSession, loadRemoteDirectory]);

  // Listen to Tauri backend events (transfer progress & auto-synced files)
  useEffect(() => {
    let unlistenProgress: (() => void) | undefined;
    let unlistenSynced: (() => void) | undefined;

    async function setupListeners() {
      unlistenProgress = await listen<any>('transfer-progress', (event) => {
        const payload = event.payload;
        setTransfers((prev) =>
          prev.map((t) => {
            if (t.id === payload.task_id) {
              return {
                ...t,
                transferred: payload.transferred,
                size: payload.total || t.size,
                speed: payload.speed,
                status: payload.status,
                error: payload.error,
              };
            }
            return t;
          })
        );

        if (payload.status === 'completed') {
          // Auto-refresh panes
          if (localPath) loadLocalDirectory(localPath);
          if (isConnected && remotePath) loadRemoteDirectory(remotePath);
        }
      });

      unlistenSynced = await listen<any>('file-auto-synced', (event) => {
        const payload = event.payload;
        addToast('success', `Saved & auto-synced "${payload.file_name}" to remote server!`);
        if (isConnected && remotePath) {
          loadRemoteDirectory(remotePath);
        }
      });
    }

    setupListeners();

    return () => {
      if (unlistenProgress) unlistenProgress();
      if (unlistenSynced) unlistenSynced();
    };
  }, [localPath, remotePath, isConnected, loadLocalDirectory, loadRemoteDirectory, addToast]);

  // Session Handlers
  const handleSaveSession = async (session: SessionConfig, secret?: string) => {
    await ipc.saveSession(session, secret);
    const updated = await ipc.listSessions();
    setSessions(updated);
    addToast('success', `Session "${session.name}" saved.`);
  };

  const handleDeleteSession = async (sessionId: string) => {
    await ipc.deleteSession(sessionId);
    const updated = await ipc.listSessions();
    setSessions(updated);
    addToast('info', 'Session deleted.');
  };

  const handleConnect = async (session: SessionConfig, secret?: string) => {
    try {
      if (activeSession) {
        await ipc.disconnectSftp(activeSession.id);
      }

      await ipc.connectSftp(session, secret);
      setActiveSession(session);
      setIsConnected(true);
      setLastSessionId(session.id);
      try {
        localStorage.setItem('mochiscp_last_session_id', session.id);
      } catch (e) {
        console.error('Failed to store last session ID:', e);
      }

      let targetRemote = session.initial_remote_path?.trim();
      if (!targetRemote || targetRemote === '~' || targetRemote === '.') {
        try {
          targetRemote = await ipc.getRemoteHome(session.id);
        } catch {
          targetRemote = '/';
        }
      }
      setRemotePath(targetRemote);
      addToast('success', `Connected to ${session.name} (${session.host})`);
    } catch (e: any) {
      setIsConnected(false);
      addToast('error', `Connection failed: ${e}`);
      throw e;
    }
  };

  // Transfer Handlers (Upload / Download)
  const handleTransferItems = async (
    items: FileItem[],
    isRemoteSource: boolean,
    targetDir?: string
  ) => {
    console.log('[MochiSCP] handleTransferItems triggered:', {
      count: items.length,
      isRemoteSource,
      targetDir,
      isConnected,
      activeSession: activeSession?.name,
    });
    if (!isConnected || !activeSession) {
      addToast('error', 'Connect to an SFTP server first to transfer files.');
      return;
    }
    if (items.length === 0) return;

    const isUpload = !isRemoteSource;
    const destFolder = targetDir
      ? targetDir
      : isUpload
      ? remotePath
      : localPath;

    setIsQueueOpen(true);

    for (const item of items) {
      const taskId = crypto.randomUUID();
      const separator = isUpload ? '/' : platform?.sep || '/';
      const cleanFolder = destFolder.endsWith(separator) && destFolder.length > 1
        ? destFolder.slice(0, -1)
        : destFolder;
      const dest = cleanFolder === '/' ? `/${item.name}` : `${cleanFolder}${separator}${item.name}`;

      const newTask: TransferTask = {
        id: taskId,
        name: item.name,
        local_path: isUpload ? item.path : dest,
        remote_path: isUpload ? dest : item.path,
        direction: isUpload ? 'upload' : 'download',
        size: item.size,
        transferred: 0,
        speed: 0,
        status: 'transferring',
        started_at: Date.now(),
      };

      setTransfers((prev) => [newTask, ...prev]);

      try {
        if (isUpload) {
          await ipc.uploadFile(activeSession.id, item.path, dest, taskId);
        } else {
          await ipc.downloadFile(activeSession.id, item.path, dest, taskId);
        }
      } catch (e: any) {
        addToast('error', `Transfer failed for ${item.name}: ${e}`);
        setTransfers((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: 'failed', error: e.toString() } : t))
        );
      }
    }

    addToast(
      'success',
      `Queued ${items.length} item${items.length > 1 ? 's' : ''} for ${isUpload ? 'upload' : 'download'}.`
    );
  };

  // Remote File Edit & Auto-Sync (WinSCP Killer Feature)
  const handleEditRemoteItem = async (item: FileItem) => {
    if (!isConnected || !activeSession) return;
    try {
      addToast('info', `Opening "${item.name}" in external editor...`);
      await ipc.editRemoteFile(activeSession.id, item.path);
      addToast('success', `Watching "${item.name}" - edits will auto-sync on save!`);
    } catch (e: any) {
      addToast('error', `Failed to open file: ${e}`);
    }
  };

  // Terminal Launcher
  const handleOpenTerminal = async () => {
    if (!activeSession) return;
    try {
      await ipc.openSshTerminal(
        activeSession.host,
        activeSession.port,
        activeSession.username,
        remotePath
      );
    } catch (e: any) {
      addToast('error', `Failed to launch terminal: ${e}`);
    }
  };

  // CRUD Operations (New Folder, Rename, Delete, Chmod)
  const handleCreateFolder = async (name: string) => {
    if (!newFolderTarget) return;
    const { isRemote, parentPath } = newFolderTarget;
    const separator = isRemote ? '/' : platform?.sep || '/';
    const targetPath = `${parentPath.endsWith(separator) ? parentPath : parentPath + separator}${name}`;

    try {
      if (isRemote && activeSession) {
        await ipc.createRemoteDir(activeSession.id, targetPath);
        loadRemoteDirectory(parentPath);
      } else {
        await ipc.createLocalDir(targetPath);
        loadLocalDirectory(parentPath);
      }
      addToast('success', `Created folder "${name}"`);
    } catch (e: any) {
      addToast('error', `Failed to create folder: ${e}`);
    }
  };

  const handleRenameItem = async (newName: string) => {
    if (!renameTarget) return;
    const { item, isRemote } = renameTarget;
    const separator = isRemote ? '/' : platform?.sep || '/';
    const parentDir = item.path.substring(0, item.path.lastIndexOf(separator)) || separator;
    const targetPath = `${parentDir.endsWith(separator) ? parentDir : parentDir + separator}${newName}`;

    try {
      if (isRemote && activeSession) {
        await ipc.renameRemoteItem(activeSession.id, item.path, targetPath);
        loadRemoteDirectory(remotePath);
      } else {
        await ipc.renameLocalItem(item.path, targetPath);
        loadLocalDirectory(localPath);
      }
      addToast('success', `Renamed to "${newName}"`);
    } catch (e: any) {
      addToast('error', `Rename failed: ${e}`);
    }
  };

  const handleDeleteItems = async () => {
    if (!deleteTarget) return;
    const { items, isRemote } = deleteTarget;

    for (const item of items) {
      try {
        if (isRemote && activeSession) {
          await ipc.deleteRemoteItem(activeSession.id, item.path, item.is_dir);
        } else {
          await ipc.deleteLocalItem(item.path, false);
        }
      } catch (e: any) {
        addToast('error', `Failed to delete ${item.name}: ${e}`);
      }
    }

    if (isRemote) {
      loadRemoteDirectory(remotePath);
      addToast('success', `Deleted ${items.length} item(s) from server.`);
    } else {
      loadLocalDirectory(localPath);
      addToast('success', `Moved ${items.length} item(s) to Trash.`);
    }
  };

  const handleApplyChmod = async (mode: number) => {
    if (!chmodTarget || !activeSession) return;
    try {
      await ipc.chmodRemoteItem(activeSession.id, chmodTarget.path, mode);
      loadRemoteDirectory(remotePath);
      addToast('success', `Updated permissions to 0${mode.toString(8)}`);
    } catch (e: any) {
      addToast('error', `Chmod failed: ${e}`);
    }
  };

  // Global DevTools shortcut (Cmd+Opt+I)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey && e.altKey && (e.key === 'i' || e.key === 'I')) {
        ipc.openDevtools();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#fff9fa] font-sans text-stone-800">
      {/* Top macOS Title Bar */}
      <TitleBar
        platform={platform}
        activeSession={activeSession}
        isConnected={isConnected}
        activeTransfersCount={transfers.filter((t) => t.status === 'transferring').length}
        onOpenSessionModal={() => setIsSessionModalOpen(true)}
        onToggleQueueDrawer={() => setIsQueueOpen(!isQueueOpen)}
        isQueueOpen={isQueueOpen}
        onOpenTerminal={handleOpenTerminal}
        onRefreshAll={() => {
          if (localPath) loadLocalDirectory(localPath);
          if (isConnected && remotePath) loadRemoteDirectory(remotePath);
        }}
      />

      {/* Main Dual-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Local Filesystem */}
        <FilePane
          title={`Local: ${platform?.os === 'macos' ? 'Mac' : 'Computer'}`}
          isRemote={false}
          currentPath={localPath}
          items={localItems}
          isLoading={isLocalLoading}
          drives={drives}
          showHidden={localShowHidden}
          onNavigate={(path) => loadLocalDirectory(path)}
          onGoHome={() => platform && loadLocalDirectory(platform.home_dir)}
          onRefresh={() => loadLocalDirectory(localPath)}
          onToggleHidden={() => setLocalShowHidden(!localShowHidden)}
          onTransferItems={handleTransferItems}
          onNewFolder={() => setNewFolderTarget({ isRemote: false, parentPath: localPath })}
          onRenameItem={(item) => setRenameTarget({ item, isRemote: false })}
          onDeleteItems={(items) => setDeleteTarget({ items, isRemote: false })}
        />

        {/* Right Pane: Remote SFTP Filesystem */}
        {isConnected && activeSession ? (
          <FilePane
            title={`Remote: ${activeSession.name} (${activeSession.username}@${activeSession.host})`}
            isRemote={true}
            currentPath={remotePath}
            items={remoteItems}
            isLoading={isRemoteLoading}
            showHidden={remoteShowHidden}
            onNavigate={(path) => loadRemoteDirectory(path)}
            onGoHome={() => loadRemoteDirectory('~')}
            onRefresh={() => loadRemoteDirectory(remotePath)}
            onToggleHidden={() => setRemoteShowHidden(!remoteShowHidden)}
            onTransferItems={handleTransferItems}
            onEditItem={handleEditRemoteItem}
            onNewFolder={() => setNewFolderTarget({ isRemote: true, parentPath: remotePath })}
            onRenameItem={(item) => setRenameTarget({ item, isRemote: true })}
            onDeleteItems={(items) => setDeleteTarget({ items, isRemote: true })}
            onChmodItem={(item) => setChmodTarget(item)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-[#fff5f7]/60 to-[#fff0f3]/40 p-8 text-center select-none border-l border-pink-100/80">
            <div className="w-16 h-16 rounded-2xl bg-rose-100/70 border border-rose-200/60 flex items-center justify-center text-rose-500 mb-4 shadow-lg shadow-rose-200/50">
              <Server className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-stone-800 mb-1">
              No Remote Host Connected
            </h3>
            <p className="text-xs text-stone-500 max-w-sm mb-5 leading-relaxed">
              Connect to an SFTP/SSH server to browse remote directories, transfer files, and edit code seamlessly.
            </p>
            <button
              onClick={() => setIsSessionModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-rose-400 hover:bg-rose-500 text-white shadow-md shadow-rose-200/80 transition-all active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-white" />
              <span>Open Sessions & Connect</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Transfer Queue Drawer */}
      <QueueDrawer
        isOpen={isQueueOpen}
        tasks={transfers}
        onToggle={() => setIsQueueOpen(!isQueueOpen)}
        onClearCompleted={() => setTransfers((prev) => prev.filter((t) => t.status !== 'completed'))}
      />

      {/* Modals */}
      <SessionModal
        isOpen={isSessionModalOpen}
        sessions={sessions}
        initialSessionId={
          activeSession?.id ||
          lastSessionId ||
          (sessions.length > 0 ? sessions[sessions.length - 1].id : undefined)
        }
        onClose={() => setIsSessionModalOpen(false)}
        onSaveSession={handleSaveSession}
        onDeleteSession={handleDeleteSession}
        onConnect={handleConnect}
        onGetSecret={ipc.getSessionSecret}
      />

      <ChmodModal
        isOpen={!!chmodTarget}
        item={chmodTarget}
        onClose={() => setChmodTarget(null)}
        onApply={handleApplyChmod}
      />

      <NewFolderModal
        isOpen={!!newFolderTarget}
        parentPath={newFolderTarget?.parentPath || ''}
        isRemote={newFolderTarget?.isRemote || false}
        onClose={() => setNewFolderTarget(null)}
        onCreate={handleCreateFolder}
      />

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        items={deleteTarget?.items || []}
        isRemote={deleteTarget?.isRemote || false}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteItems}
      />

      <RenameModal
        isOpen={!!renameTarget}
        item={renameTarget?.item || null}
        onClose={() => setRenameTarget(null)}
        onRename={handleRenameItem}
      />

      {/* Toast Notification Stack */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
