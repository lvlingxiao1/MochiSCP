import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import { FileItem } from '../../types';

interface RenameModalProps {
  isOpen: boolean;
  item: FileItem | null;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  item,
  onClose,
  onRename,
}) => {
  const [newName, setNewName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setNewName(item.name);
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newName === item.name) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await onRename(newName.trim());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 backdrop-blur-xs p-4 animate-pop-in">
      <div className="w-full max-w-sm bg-white border border-pink-100 rounded-xl shadow-2xl shadow-rose-950/10 overflow-hidden">
        <div className="h-11 border-b border-pink-100 px-4 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2 font-semibold text-xs text-stone-800">
            <Edit3 className="w-3.5 h-3.5 text-rose-500" />
            <span>Rename Item</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-rose-100/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-stone-600 font-medium">New Name</label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full bg-rose-50/30 border border-pink-200 rounded-lg px-3 py-1.5 text-stone-800 focus:outline-none focus:border-rose-400 focus:bg-white font-mono"
            />
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
              type="submit"
              disabled={isSubmitting || !newName.trim()}
              className="px-4 py-1.5 rounded-lg font-semibold bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white transition-all shadow-sm shadow-rose-200 active:scale-95 cursor-pointer"
            >
              {isSubmitting ? 'Renaming...' : 'Rename'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
