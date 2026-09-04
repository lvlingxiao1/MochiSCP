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
      className={`h-12 border-b border-pink-100/90 bg-white/80 backdrop-blur-md flex items-center justify-between px-3 select-none z-30 ${
        isMac ? 'pl-20' : 'pl-3'
      }`}
    >
      {/* Left: App Title / Connection Badge */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 font-bold tracking-tight text-rose-600 text-sm">
          <FolderSync className="w-4 h-4 text-rose-500" />
          <span>MochiSCP</span>
        </div>

        <div className="h-4 w-[1px] bg-pink-200/80 mx-1" />

        {/* Current Active Connection Status */}
        {isConnected && activeSession ? (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-xs text-emerald-700 font-medium shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-800">{activeSession.name}</span>
            <span className="text-emerald-600/80 text-[11px]">
              ({activeSession.username}@{activeSession.host})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50/60 border border-pink-200/60 text-xs text-stone-500">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
            <span>Disconnected</span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={onRefreshAll}
          title="Refresh both panes"
          className="p-1.5 rounded-md text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>


        {isConnected && activeSession && (
          <button
            onClick={onOpenTerminal}
            title="Open SSH Terminal"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-stone-600 hover:text-rose-600 hover:bg-rose-50 border border-pink-100/80 transition-colors cursor-pointer"
          >
            <Terminal className="w-3.5 h-3.5 text-rose-500" />
            <span>Terminal</span>
          </button>
        )}

        <button
          onClick={onToggleQueueDrawer}
          title="Transfer Queue"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
            isQueueOpen
              ? 'bg-rose-100 text-rose-800 border border-rose-200 shadow-xs'
              : 'text-stone-600 hover:text-rose-600 hover:bg-rose-50 border border-pink-100/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-rose-500" />
          <span>Transfers</span>
          {activeTransfersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] font-bold text-white leading-tight">
              {activeTransfersCount}
            </span>
          )}
        </button>

        <button
          onClick={onOpenSessionModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-rose-400 hover:bg-rose-500 text-white shadow-sm shadow-rose-200 transition-all active:scale-95 cursor-pointer"
        >
          <Server className="w-3.5 h-3.5" />
          <span>Sessions</span>
        </button>
      </div>
    </header>
  );
};
