import React, { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { FileItem } from '../../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  item: FileItem | null;
  isRemote: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  item,
  isRemote,
  onClose,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !item) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-pop-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
        <div className="h-11 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2 font-semibold text-xs text-rose-400">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Confirm Deletion</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-200 font-medium">
                Are you sure you want to delete this {item.is_dir ? 'folder' : 'file'}?
              </p>
              <p className="text-slate-400 font-mono text-[11px] break-all bg-slate-950/40 p-1.5 rounded border border-slate-800">
                {item.name}
              </p>
              <p className="text-[11px] text-slate-500">
                {isRemote
                  ? '⚠️ This will be permanently deleted from the remote server.'
                  : '🗑️ This item will be moved to macOS Trash.'}
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-4 py-1.5 rounded-lg font-semibold bg-rose-500 hover:bg-rose-400 text-white transition-all shadow-sm active:scale-95"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
