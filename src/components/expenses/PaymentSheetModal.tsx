import React from 'react';
import { X, IndianRupee, Download, Printer, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Expense, Driver } from '../../types';

export interface PaymentSheetModalProps {
  isOpen: boolean;
  selectedVehicle: string;
  filteredExpenses: Expense[];
  driver: Driver | null;
  submitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onExport: (format: 'csv' | 'excel' | 'pdf') => void;
}

export function PaymentSheetModal({
  isOpen,
  selectedVehicle,
  filteredExpenses,
  driver,
  submitting,
  onClose,
  onConfirm,
  onExport,
}: PaymentSheetModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Payment Sheet</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Review and process bulk payment for {selectedVehicle}
                </p>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
              {/* Driver & Bank Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Driver Details
                  </p>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Name</span>
                      <span className="text-sm font-bold text-slate-900">{driver?.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">Phone</span>
                      <span className="text-sm font-bold text-slate-900">{driver?.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                  <p className="text-[10px] font-bold text-primary/60 uppercase tracking-wider mb-4">
                    Bank & UPI
                  </p>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">A/C No</span>
                      <span className="text-sm font-bold text-slate-900">
                        {driver?.bankAccount || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-slate-500">IFSC</span>
                      <span className="text-sm font-bold text-slate-900">{driver?.ifsc || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-primary/10">
                      <span className="text-sm text-slate-500 font-bold">UPI ID</span>
                      <span className="text-sm font-bold text-primary">{driver?.upiId || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Expense Breakdown
                </p>
                <div className="space-y-2">
                  {filteredExpenses.map((e) => (
                    <div
                      key={e.id}
                      className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                          <IndianRupee className="w-4 h-4 text-slate-400" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{e.category}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(e.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        ₹{e.amount.toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl mt-4">
                    <span className="font-bold">Total Amount</span>
                    <span className="text-xl font-black">
                      ₹{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Export Options */}
              <div className="flex flex-wrap gap-3 pt-4">
                <button
                  onClick={() => onExport('csv')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button
                  onClick={() => onExport('excel')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <Download className="w-4 h-4" /> Excel
                </button>
                <button
                  onClick={() => onExport('pdf')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                >
                  <Printer className="w-4 h-4" /> PDF
                </button>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 hover:bg-white transition-all border border-transparent hover:border-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={submitting}
                className="flex-1 py-4 px-6 bg-accent text-white rounded-2xl font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/10 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Confirm & Mark All Paid'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
