import React from 'react';
import { X, Plus, AlertCircle, IndianRupee, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shipment } from '../../types';
import { EXPENSE_CATEGORIES } from '../../constants/expenseCategories';

export interface TripExpenseItem {
  category: string;
  amount: string;
  description: string;
}

export interface ExistingExpense {
  id?: string;
  category: string;
  amount: number;
  date: string;
  tripId?: string;
}

export interface TripExpenseModalProps {
  isOpen: boolean;
  selectedTrip: Shipment | null;
  expenseItems: TripExpenseItem[];
  setExpenseItems: React.Dispatch<React.SetStateAction<TripExpenseItem[]>>;
  existingExpenses: ExistingExpense[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}


export function TripExpenseModal({
  isOpen,
  selectedTrip,
  expenseItems,
  setExpenseItems,
  existingExpenses,
  submitting,
  onClose,
  onSubmit,
}: TripExpenseModalProps) {
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
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-emerald-50">
              <div>
                <h2 className="text-2xl font-bold text-emerald-900 tracking-tight">
                  Add Trip Expenses
                </h2>
                <p className="text-xs text-emerald-700 mt-1">
                  Trip #{selectedTrip?.tripId} • {selectedTrip?.vehicleNumber}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-emerald-400 hover:text-emerald-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={onSubmit}
              className="p-8 space-y-6 max-h-[70vh] overflow-y-auto"
            >
              {/* Existing Expenses Summary */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                <div className="flex items-center gap-2 text-amber-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Existing Expenses for this Trip
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto">
                  <table className="w-full text-left text-[10px]">
                    <thead>
                      <tr className="text-amber-600/60 border-b border-amber-200">
                        <th className="pb-1">Category</th>
                        <th className="pb-1">Amount</th>
                        <th className="pb-1">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {existingExpenses.map((e, i) => (
                        <tr key={i} className="text-amber-800">
                          <td className="py-1 font-medium">{e.category}</td>
                          <td className="py-1">₹{e.amount}</td>
                          <td className="py-1">{new Date(e.date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {existingExpenses.length === 0 && (
                        <tr>
                          <td
                            colSpan={3}
                            className="py-2 text-center text-amber-600/40 italic"
                          >
                            No expenses recorded yet
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-4">
                {expenseItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 relative"
                  >
                    {expenseItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpenseItems(expenseItems.filter((_, i) => i !== index))
                        }
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Type
                        </label>
                        <select
                          required
                          value={item.category}
                          onChange={(e) => {
                            const newItems = expenseItems.map((it, i) =>
                              i === index ? { ...it, category: e.target.value } : it
                            );
                            setExpenseItems(newItems);
                          }}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                        >
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Amount
                        </label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            required
                            type="number"
                            value={item.amount}
                            onChange={(e) => {
                              const newItems = expenseItems.map((it, i) =>
                                i === index ? { ...it, amount: e.target.value } : it
                              );
                              setExpenseItems(newItems);
                            }}
                            placeholder="0.00"
                            className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Description
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const newItems = expenseItems.map((it, i) =>
                            i === index ? { ...it, description: e.target.value } : it
                          );
                          setExpenseItems(newItems);
                        }}
                        placeholder="Optional details..."
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() =>
                  setExpenseItems([
                    ...expenseItems,
                    { category: 'Other', amount: '', description: '' },
                  ])
                }
                className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Another Expense
              </button>

              <div className="pt-6 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  aria-label="Confirm Completion"
                  className="flex-1 py-4 px-6 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    'Confirm Completion'
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
