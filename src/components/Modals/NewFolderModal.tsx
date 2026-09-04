import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

interface NewFolderModalProps {
  isOpen: boolean;
  parentPath: string;
  isRemote: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export const NewFolderModal: React.FC<NewFolderModalProps> = ({
  isOpen,
  parentPath,
  onClose,
  onCreate,
}) => {
  const [folderName, setFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreate(folderName.trim());
      setFolderName('');
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
            <FolderPlus className="w-3.5 h-3.5 text-rose-500" />
            <span>Create New Folder</span>
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
            <label className="text-stone-600 font-medium">Folder Name</label>
            <input
              autoFocus
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="e.g. assets, logs, backup"
              className="w-full bg-rose-50/30 border border-pink-200 rounded-lg px-3 py-1.5 text-stone-800 focus:outline-none focus:border-rose-400 focus:bg-white"
            />
          </div>

          <div className="text-[11px] text-stone-500 truncate">
            Target location: <span className="font-mono text-stone-700">{parentPath}</span>
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
              disabled={isSubmitting || !folderName.trim()}
              className="px-4 py-1.5 rounded-lg font-semibold bg-rose-400 hover:bg-rose-500 disabled:opacity-50 text-white transition-all shadow-sm shadow-rose-200 active:scale-95 cursor-pointer"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
