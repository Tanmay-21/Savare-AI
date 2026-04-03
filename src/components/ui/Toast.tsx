import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import type { Toast as ToastData } from '../../contexts/ToastContext';

const ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const STYLES = {
  success: 'bg-white border-emerald-200 text-emerald-700',
  error: 'bg-white border-red-200 text-red-700',
  info: 'bg-white border-blue-200 text-blue-700',
};

const ICON_STYLES = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  info: 'text-blue-500',
};

export interface ToastProps {
  key?: React.Key;
  toast: ToastData;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const Icon = ICON[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex items-start gap-3 w-full max-w-sm px-5 py-4 rounded-2xl border shadow-lg shadow-slate-200/60 pointer-events-auto',
        STYLES[toast.type]
      )}
    >
      <Icon className={cn('w-5 h-5 mt-0.5 shrink-0', ICON_STYLES[toast.type])} />
      <p className="flex-1 text-sm font-semibold text-slate-800 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
