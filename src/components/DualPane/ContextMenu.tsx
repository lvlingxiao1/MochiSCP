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
  selectedCount?: number;
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
  selectedCount = 1,
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
      className="fixed z-50 w-52 py-1.5 bg-white/95 backdrop-blur-md border border-pink-100 rounded-xl shadow-xl shadow-rose-950/10 text-xs text-stone-700 animate-pop-in select-none"
    >
      {selectedCount > 1 ? (
        <>
          <button
            onClick={() => {
              onTransfer();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left font-medium text-rose-600 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {isRemote ? (
                <Download className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <Upload className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span>
                {isRemote
                  ? `Download (${selectedCount} items)`
                  : `Upload (${selectedCount} items)`}
              </span>
            </div>
          </button>

          <div className="h-[1px] bg-pink-100 my-1" />

          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-100/70 text-rose-600 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Delete ({selectedCount} items)</span>
            </div>
            <span className="text-[10px] text-rose-400 font-mono">⌘⌫</span>
          </button>
        </>
      ) : item ? (
        <>
          {item.is_dir ? (
            <button
              onClick={() => {
                onOpen();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-50 hover:text-rose-900 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <FolderOpen className="w-3.5 h-3.5 text-rose-400" />
                <span>Open Folder</span>
              </div>
              <span className="text-[10px] text-stone-400 font-mono">Enter</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  onTransfer();
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-50 hover:text-rose-700 transition-colors text-left font-medium text-rose-600 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  {isRemote ? (
                    <Download className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-rose-500" />
                  )}
                  <span>{isRemote ? 'Download to Local' : 'Upload to Remote'}</span>
                </div>
              </button>

              {isRemote && (
                <button
                  onClick={() => {
                    onEdit();
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-50 hover:text-rose-900 transition-colors text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Edit (Auto-Sync)</span>
                  </div>
                </button>
              )}
            </>
          )}

          <div className="h-[1px] bg-pink-100 my-1" />
        </>
      ) : null}

      <button
        onClick={() => {
          onNewFolder();
          onClose();
        }}
        className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-50 hover:text-rose-900 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
          <span>New Folder</span>
        </div>
      </button>

      {item && selectedCount <= 1 && (
        <>
          <button
            onClick={() => {
              onRename();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-50 hover:text-rose-900 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Edit3 className="w-3.5 h-3.5 text-stone-400" />
              <span>Rename</span>
            </div>
          </button>

          {isRemote && (
            <button
              onClick={() => {
                onChmod();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-50 hover:text-rose-900 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-purple-500" />
                <span>Permissions (chmod)</span>
              </div>
            </button>
          )}

          <button
            onClick={() => {
              onCopyPath();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-50 hover:text-rose-900 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Copy className="w-3.5 h-3.5 text-stone-400" />
              <span>Copy Path</span>
            </div>
          </button>

          <div className="h-[1px] bg-pink-100 my-1" />

          <button
            onClick={() => {
              onDelete();
              onClose();
            }}
            className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-rose-100/70 text-rose-600 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Delete</span>
            </div>
            <span className="text-[10px] text-rose-400 font-mono">⌘⌫</span>
          </button>
        </>
      )}
    </div>
  );
};
