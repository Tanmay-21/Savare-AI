import React from 'react';
import { Truck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PayVehicleModalProps {
  vehicleNumber: string | null;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function PayVehicleModal({
  vehicleNumber,
  submitting,
  onCancel,
  onConfirm,
}: PayVehicleModalProps) {
  return (
    <AnimatePresence>
      {vehicleNumber && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center"
          >
            <div className="w-16 h-16 bg-accent/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Truck className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Vehicle Payment</h3>
            <p className="text-slate-500 mb-2">
              Payout report for{' '}
              <span className="font-bold text-slate-900">{vehicleNumber}</span> has been generated.
            </p>
            <p className="text-slate-500 mb-8">
              Are you sure you want to mark all pending expenses for this vehicle as paid?
            </p>
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-accent text-white rounded-2xl font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/10 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Confirm Paid'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
