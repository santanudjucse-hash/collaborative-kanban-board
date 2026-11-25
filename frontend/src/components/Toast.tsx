import React from 'react';
import { ToastMessage } from '../types/Task';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const isError = toast.type === 'error';
  const isSuccess = toast.type === 'success';

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl transition-all duration-300 animate-slide-up ${
        isError
          ? 'bg-rose-950/90 border-rose-500/40 text-rose-100 backdrop-blur-md'
          : isSuccess
          ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-100 backdrop-blur-md'
          : 'bg-slate-900/90 border-slate-700 text-slate-100 backdrop-blur-md'
      }`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
        {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        {!isError && !isSuccess && <Info className="w-5 h-5 text-blue-400" />}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold tracking-tight">{toast.title}</h4>
        <p className="text-xs text-slate-300 mt-0.5 leading-relaxed break-words">{toast.message}</p>
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-xs font-medium underline hover:text-white transition-colors"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      <button
        onClick={onDismiss}
        aria-label="Dismiss toast"
        className="flex-shrink-0 text-slate-400 hover:text-white p-1 rounded-md transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
