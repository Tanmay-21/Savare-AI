import React from 'react';
import { X, Wallet, CreditCard, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Expense } from '../../types';
import { cn } from '../../utils/cn';

export interface MarkAsPaidModalProps {
  expense: (Expense & { selectedPaymentMethod?: string }) | null;
  remark: string;
  submitting: boolean;
  onRemarkChange: (remark: string) => void;
  onPaymentMethodChange: (method: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

const PAYMENT_METHODS = [
  { id: 'cash', icon: Wallet, color: 'emerald', label: 'Cash' },
  { id: 'online', icon: CreditCard, color: 'blue', label: 'Online' },
];

export function MarkAsPaidModal({
  expense,
  remark,
  submitting,
  onRemarkChange,
  onPaymentMethodChange,
  onClose,
  onSubmit,
}: MarkAsPaidModalProps) {
  return (
    <AnimatePresence>
      {expense && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Mark as Paid</h3>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={onSubmit} className="p-6 space-y-4">
              <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-accent uppercase tracking-wider">
                    Amount to Pay
                  </span>
                  <span className="text-lg font-bold text-accent">
                    ₹{expense.amount.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-xs text-accent/70">
                  {expense.category} expense for trip #{expense.tripId?.slice(-6).toUpperCase()}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onPaymentMethodChange(m.id)}
                      className={cn(
                        'flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border transition-all font-bold text-sm',
                        expense.selectedPaymentMethod === m.id
                          ? `bg-${m.color}-50 border-${m.color}-200 text-${m.color}-700 ring-2 ring-${m.color}-500/10`
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                      )}
                    >
                      <m.icon className="w-4 h-4" />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Payment Remark</label>
                <input
                  autoFocus
                  type="text"
                  value={remark}
                  onChange={(e) => onRemarkChange(e.target.value)}
                  placeholder="e.g. Paid via GPay, Transaction ID: 123..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Payment'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
