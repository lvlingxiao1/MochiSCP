import React, { useEffect, useRef } from 'react';
import {
  Upload,
  Download,
  Edit3,
  FolderPlus,
  Trash2,
  Lock,
  Copy,
  FolderOpen,
} from 'lucide-react';
import { FileItem } from '../../types';

export interface ContextMenuProps {
  x: number;
  y: number;
  item: FileItem | null;
  isRemote: boolean;
  onClose: () => void;
  onTransfer: () => void;
  onEdit: () => void;
  onOpen: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onChmod: () => void;
  onDelete: () => void;
  onCopyPath: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  item,
  isRemote,
  onClose,
  onTransfer,
  onEdit,
  onOpen,
  onNewFolder,
  onRename,
  onChmod,
  onDelete,
  onCopyPath,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust coordinates so menu does not overflow window edges
  const posX = Math.min(x, window.innerWidth - 220);
  const posY = Math.min(y, window.innerHeight - 300);

  return (
    <div
      ref={menuRef}
      style={{ left: `${posX}px`, top: `${posY}px` }}
      className="fixed z-50 w-52 py-1.5 bg-slate-800/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-xl text-xs text-slate-200 animate-pop-in select-none"
    >
      {item && (
        <>
          {item.is_dir ? (
            <button
              onClick={() => {
                onOpen();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-sky-600/30 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
                <span>Open Folder</span>
              </div>
              <span className="text-[10px] text-slate-400">Enter</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  onTransfer();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-sky-600/30 hover:text-white transition-colors text-left font-medium text-sky-300"
              >
                <div className="flex items-center gap-2">
                  {isRemote ? (
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-sky-400" />
                  )}
                  <span>{isRemote ? 'Download to Local' : 'Upload to Remote'}</span>
                </div>
                <span className="text-[10px] text-slate-400">F5</span>
              </button>

              {isRemote && (
                <button
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-sky-600/30 hover:text-white transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Edit (Auto-Sync)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">F4</span>
                </button>
              )}
            </>
          )}

          <div className="h-[1px] bg-slate-700/60 my-1" />
        </>
      )}

      <button
        onClick={() => {
          onNewFolder();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-sky-600/30 hover:text-white transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
          <span>New Folder</span>
        </div>
        <span className="text-[10px] text-slate-400">F7</span>
      </button>

      {item && (
        <>
          <button
            onClick={() => {
              onRename();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-sky-600/30 hover:text-white transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Edit3 className="w-3.5 h-3.5 text-slate-400" />
              <span>Rename</span>
            </div>
            <span className="text-[10px] text-slate-400">F2</span>
          </button>

          {isRemote && (
            <button
              onClick={() => {
                onChmod();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-sky-600/30 hover:text-white transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-purple-400" />
                <span>Permissions (chmod)</span>
              </div>
            </button>
          )}

          <button
            onClick={() => {
              onCopyPath();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-sky-600/30 hover:text-white transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-slate-400" />
              <span>Copy Path</span>
            </div>
          </button>

          <div className="h-[1px] bg-slate-700/60 my-1" />

          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Delete</span>
            </div>
            <span className="text-[10px] text-rose-400/80">F8</span>
          </button>
        </>
      )}
    </div>
  );
};
