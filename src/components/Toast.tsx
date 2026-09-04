import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-12 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg shadow-lg border backdrop-blur-md text-xs font-medium animate-pop-in select-none ${
        toast.type === 'success'
          ? 'bg-white/95 border-emerald-200 text-stone-800 shadow-stone-900/5'
          : toast.type === 'error'
          ? 'bg-white/95 border-rose-200 text-stone-800 shadow-rose-950/5'
          : 'bg-white/95 border-pink-200 text-stone-800 shadow-rose-950/5'
      }`}
    >
      {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
      {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />}
      {toast.type === 'info' && <Info className="w-4 h-4 text-rose-400 shrink-0" />}

      <span className="max-w-xs">{toast.message}</span>

      <button
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 rounded hover:bg-rose-100 text-stone-400 hover:text-stone-700 transition-colors ml-1 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
