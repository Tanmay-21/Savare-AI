import React from 'react';
import { IndianRupee, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PayAllConfirmModalProps {
  isOpen: boolean;
  pendingCount: number;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PayAllConfirmModal({
  isOpen,
  pendingCount,
  submitting,
  onCancel,
  onConfirm,
}: PayAllConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-accent/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <IndianRupee className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Pay All Pending?</h3>
            <p className="text-slate-500 mb-8 text-sm">
              Are you sure you want to mark all pending expenses across all vehicles as paid? This
              will process {pendingCount} records.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={submitting}
                aria-label="Confirm All"
                className="flex-1 py-3 px-4 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/10 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Confirm All'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
