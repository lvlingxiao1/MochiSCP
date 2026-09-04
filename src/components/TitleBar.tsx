import React from 'react';
import {
  FolderSync,
  Terminal,
  Layers,
  RefreshCw,
  Server,
} from 'lucide-react';
import { PlatformInfo, SessionConfig } from '../types';

interface TitleBarProps {
  platform: PlatformInfo | null;
  activeSession: SessionConfig | null;
  isConnected: boolean;
  activeTransfersCount: number;
  onOpenSessionModal: () => void;
  onToggleQueueDrawer: () => void;
  isQueueOpen: boolean;
  onOpenTerminal: () => void;
  onRefreshAll: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  platform,
  activeSession,
  isConnected,
  activeTransfersCount,
  onOpenSessionModal,
  onToggleQueueDrawer,
  isQueueOpen,
  onOpenTerminal,
  onRefreshAll,
}) => {
  const isMac = platform?.os === 'macos';

  return (
    <header
      data-tauri-drag-region
      className={`h-12 border-b border-slate-700/60 bg-slate-900/90 backdrop-blur-md flex items-center justify-between px-3 select-none z-30 ${
        isMac ? 'pl-20' : 'pl-3'
      }`}
    >
      {/* Left: App Title / Connection Badge */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-sky-400 text-sm">
          <FolderSync className="w-4 h-4 text-sky-400" />
          <span>SkySCP</span>
        </div>

        <div className="h-4 w-[1px] bg-slate-700 mx-1" />

        {/* Current Active Connection Status */}
        {isConnected && activeSession ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">{activeSession.name}</span>
            <span className="text-slate-400 text-[11px]">
              ({activeSession.username}@{activeSession.host})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span>Disconnected</span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onRefreshAll}
          title="Refresh both panes"
          className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {isConnected && activeSession && (
          <button
            onClick={onOpenTerminal}
            title="Open SSH Terminal"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>Terminal</span>
          </button>
        )}

        <button
          onClick={onToggleQueueDrawer}
          title="Transfer Queue"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isQueueOpen
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
              : 'text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>Transfers</span>
          {activeTransfersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-sky-500 text-[10px] font-bold text-white leading-tight">
              {activeTransfersCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenSessionModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white shadow-sm shadow-sky-500/20 transition-all active:scale-95"
        >
          <Server className="w-3.5 h-3.5" />
          <span>Sessions</span>
        </button>
      </div>
    </header>
  );
};
