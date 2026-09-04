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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 backdrop-blur-xs p-4 animate-pop-in">
      <div className="w-full max-w-sm bg-white border border-pink-100 rounded-xl shadow-2xl shadow-rose-950/10 overflow-hidden">
        {/* Header */}
        <div className="h-11 border-b border-pink-100 px-4 flex items-center justify-between bg-rose-50/50">
          <div className="flex items-center gap-2 font-semibold text-xs text-stone-800">
            <Lock className="w-3.5 h-3.5 text-rose-500" />
            <span>Change Permissions (chmod)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-stone-400 hover:text-stone-700 hover:bg-rose-100/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <div className="text-stone-500">
            Target: <span className="font-semibold text-stone-800">{item.name}</span>
          </div>

          {/* 3x3 Checkbox Grid */}
          <div className="grid grid-cols-4 gap-2 border border-pink-100 rounded-lg p-3 bg-rose-50/30 text-center">
            <div className="text-stone-500 font-semibold text-[11px] text-left">Role</div>
            <div className="text-stone-400 font-semibold text-[11px]">Read</div>
            <div className="text-stone-400 font-semibold text-[11px]">Write</div>
            <div className="text-stone-400 font-semibold text-[11px]">Execute</div>

            {/* Owner */}
            <div className="text-stone-700 font-medium text-left">Owner</div>
            <div>
              <input
                type="checkbox"
                checked={ownerR}
                onChange={(e) => setOwnerR(e.target.checked)}
                className="rounded border-pink-300 text-rose-500 focus:ring-0 accent-rose-500 cursor-pointer"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={ownerW}
                onChange={(e) => setOwnerW(e.target.checked)}
                className="rounded border-pink-300 text-rose-500 focus:ring-0 accent-rose-500 cursor-pointer"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={ownerX}
                onChange={(e) => setOwnerX(e.target.checked)}
                className="rounded border-pink-300 text-rose-500 focus:ring-0 accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Group */}
            <div className="text-stone-700 font-medium text-left">Group</div>
            <div>
              <input
                type="checkbox"
                checked={groupR}
                onChange={(e) => setGroupR(e.target.checked)}
                className="rounded border-pink-300 text-rose-500 focus:ring-0 accent-rose-500 cursor-pointer"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={groupW}
                onChange={(e) => setGroupW(e.target.checked)}
                className="rounded border-pink-300 text-rose-500 focus:ring-0 accent-rose-500 cursor-pointer"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={groupX}
                onChange={(e) => setGroupX(e.target.checked)}
                className="rounded border-pink-300 text-rose-500 focus:ring-0 accent-rose-500 cursor-pointer"
              />
            </div>

            {/* Others */}
            <div className="text-stone-700 font-medium text-left">Others</div>
            <div>
              <input
                type="checkbox"
                checked={otherR}
                onChange={(e) => setOtherR(e.target.checked)}
                className="rounded border-pink-300 text-rose-500 focus:ring-0 accent-rose-500 cursor-pointer"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={otherW}
                onChange={(e) => setOtherW(e.target.checked)}
                className="rounded border-pink-300 text-rose-500 focus:ring-0 accent-rose-500 cursor-pointer"
              />
            </div>
            <div>
              <input
                type="checkbox"
                checked={otherX}
                onChange={(e) => setOtherX(e.target.checked)}
                className="rounded border-pink-300 text-rose-500 focus:ring-0 accent-rose-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Octal value display/input */}
          <div className="flex items-center justify-between">
            <span className="text-stone-500">Octal permissions:</span>
            <input
              type="text"
              value={octalStr}
              onChange={(e) => handleOctalChange(e.target.value)}
              className="w-24 bg-rose-50/40 border border-pink-200 rounded-lg px-2.5 py-1 text-center font-mono font-bold text-rose-600 text-sm focus:outline-none focus:border-rose-400 focus:bg-white"
            />
          </div>

          {/* Actions */}
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
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg font-semibold bg-rose-400 hover:bg-rose-500 text-white transition-all shadow-sm shadow-rose-200 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
