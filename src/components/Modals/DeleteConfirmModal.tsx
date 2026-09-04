import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { FileItem } from '../../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  items: FileItem[];
  isRemote: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  items,
  isRemote,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || items.length === 0) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const isSingle = items.length === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 backdrop-blur-xs p-4 animate-pop-in">
      <div className="w-full max-w-sm bg-white border border-pink-100 rounded-xl shadow-2xl shadow-rose-950/10 overflow-hidden">
        <div className="h-11 border-b border-pink-100 px-4 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2 font-semibold text-xs text-stone-800">
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>Confirm Deletion</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-rose-100/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-100/70 text-rose-500 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <p className="text-stone-800 font-medium">
                {isSingle
                  ? `Are you sure you want to delete this ${items[0].is_dir ? 'folder' : 'file'}?`
                  : `Are you sure you want to delete these ${items.length} items?`}
              </p>

              {isSingle ? (
                <p className="text-stone-700 font-mono text-[11px] break-all bg-rose-50/40 p-1.5 rounded border border-pink-100">
                  {items[0].name}
                </p>
              ) : (
                <div className="max-h-24 overflow-y-auto bg-rose-50/40 p-1.5 rounded border border-pink-100 space-y-0.5">
                  {items.map((it) => (
                    <div key={it.path} className="text-stone-600 font-mono text-[10px] truncate">
                      • {it.name}
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-stone-500 pt-1">
                {isRemote
                  ? '⚠️ Items will be permanently deleted from the remote server.'
                  : '🗑️ Items will be moved to macOS Trash.'}
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-pink-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-1.5 rounded-lg font-semibold bg-rose-500 hover:bg-rose-600 text-white transition-all shadow-sm shadow-rose-200 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : `Delete ${items.length > 1 ? `(${items.length})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
