import React, { useState, useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import { FileItem } from '../../types';

interface ChmodModalProps {
  isOpen: boolean;
  item: FileItem | null;
  onClose: () => void;
  onApply: (mode: number) => Promise<void>;
}

export const ChmodModal: React.FC<ChmodModalProps> = ({
  isOpen,
  item,
  onClose,
  onApply,
}) => {
  const [ownerR, setOwnerR] = useState(false);
  const [ownerW, setOwnerW] = useState(false);
  const [ownerX, setOwnerX] = useState(false);

  const [groupR, setGroupR] = useState(false);
  const [groupW, setGroupW] = useState(false);
  const [groupX, setGroupX] = useState(false);

  const [otherR, setOtherR] = useState(false);
  const [otherW, setOtherW] = useState(false);
  const [otherX, setOtherX] = useState(false);

  const [octalStr, setOctalStr] = useState('0755');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize permissions from item
  useEffect(() => {
    if (!isOpen || !item) return;

    let p = item.permissions || '0755';
    if (p.length > 3) {
      p = p.slice(-3);
    }
    const o = parseInt(p[0] || '7', 10);
    const g = parseInt(p[1] || '5', 10);
    const ot = parseInt(p[2] || '5', 10);

    setOwnerR((o & 4) !== 0);
    setOwnerW((o & 2) !== 0);
    setOwnerX((o & 1) !== 0);

    setGroupR((g & 4) !== 0);
    setGroupW((g & 2) !== 0);
    setGroupX((g & 1) !== 0);

    setOtherR((ot & 4) !== 0);
    setOtherW((ot & 2) !== 0);
    setOtherX((ot & 1) !== 0);
  }, [isOpen, item]);

  // Recalculate octal when checkboxes change
  useEffect(() => {
    const o = (ownerR ? 4 : 0) + (ownerW ? 2 : 0) + (ownerX ? 1 : 0);
    const g = (groupR ? 4 : 0) + (groupW ? 2 : 0) + (groupX ? 1 : 0);
    const ot = (otherR ? 4 : 0) + (otherW ? 2 : 0) + (otherX ? 1 : 0);
    setOctalStr(`0${o}${g}${ot}`);
  }, [ownerR, ownerW, ownerX, groupR, groupW, groupX, otherR, otherW, otherX]);

  if (!isOpen || !item) return null;

  const handleOctalChange = (val: string) => {
    setOctalStr(val);
    const digits = val.replace(/\D/g, '').slice(-3);
    if (digits.length === 3) {
      const o = parseInt(digits[0], 10);
      const g = parseInt(digits[1], 10);
      const ot = parseInt(digits[2], 10);

      setOwnerR((o & 4) !== 0);
      setOwnerW((o & 2) !== 0);
      setOwnerX((o & 1) !== 0);

      setGroupR((g & 4) !== 0);
      setGroupW((g & 2) !== 0);
      setGroupX((g & 1) !== 0);

      setOtherR((ot & 4) !== 0);
      setOtherW((ot & 2) !== 0);
      setOtherX((ot & 1) !== 0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const mode = parseInt(octalStr, 8);
      await onApply(mode);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-pop-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="h-11 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2 font-semibold text-xs text-slate-100">
            <Lock className="w-3.5 h-3.5 text-purple-400" />
            <span>Change Permissions (chmod)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <div className="text-slate-400">
            Target: <span className="font-semibold text-slate-200">{item.name}</span>
          </div>

          {/* 3x3 Checkbox Grid */}
          <div className="grid grid-cols-4 gap-2 border border-slate-800 rounded-lg p-3 bg-slate-950/20 text-center">
            <div className="text-slate-500 font-semibold text-[11px] text-left">Role</div>
            <div className="text-slate-400 font-semibold text-[11px]">Read</div>
            <div className="text-slate-400 font-semibold text-[11px]">Write</div>
            <div className="text-slate-400 font-semibold text-[11px]">Execute</div>

            {/* Owner */}
            <div className="text-slate-300 font-medium text-left">Owner</div>
            <div>
              <input
                type="checkbox"
                checked={ownerR}
                onChange={(e) => setOwnerR(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={ownerW}
                onChange={(e) => setOwnerW(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={ownerX}
                onChange={(e) => setOwnerX(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
              />
            </div>

            {/* Group */}
            <div className="text-slate-300 font-medium text-left">Group</div>
            <div>
              <input
                type="checkbox"
                checked={groupR}
                onChange={(e) => setGroupR(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={groupW}
                onChange={(e) => setGroupW(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={groupX}
                onChange={(e) => setGroupX(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
              />
            </div>

            {/* Others */}
            <div className="text-slate-300 font-medium text-left">Others</div>
            <div>
              <input
                type="checkbox"
                checked={otherR}
                onChange={(e) => setOtherR(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={otherW}
                onChange={(e) => setOtherW(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={otherX}
                onChange={(e) => setOtherX(e.target.checked)}
                className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-0"
              />
            </div>
          </div>

          {/* Octal value display/input */}
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Octal permissions:</span>
            <input
              type="text"
              value={octalStr}
              onChange={(e) => handleOctalChange(e.target.value)}
              className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-center font-mono font-bold text-sky-400 text-sm focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg font-semibold bg-sky-500 hover:bg-sky-400 text-white transition-all shadow-sm active:scale-95"
            >
              {isSubmitting ? 'Saving...' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
