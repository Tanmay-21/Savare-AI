import React from 'react';
import { X, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Expense, Shipment, Vehicle, Driver } from '../../types';
import { EXPENSE_CATEGORIES } from '../../constants/expenseCategories';

export interface ExpenseFormModalProps {
  isOpen: boolean;
  editingExpense: Expense | null;
  formData: Omit<Expense, 'id'>;
  setFormData: React.Dispatch<React.SetStateAction<Omit<Expense, 'id'>>>;
  expenseItems: { category: string; amount: number; description: string }[];
  setExpenseItems: React.Dispatch<
    React.SetStateAction<{ category: string; amount: number; description: string }[]>
  >;
  trips: Shipment[];
  vehicles: Vehicle[];
  drivers: Driver[];
  expenses: Expense[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function ExpenseFormModal({
  isOpen,
  editingExpense,
  formData,
  setFormData,
  expenseItems,
  setExpenseItems,
  trips,
  expenses,
  submitting,
  onClose,
  onSubmit,
}: ExpenseFormModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
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
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Date</label>
                  <input
                    required
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Trip</label>
                  <select
                    required
                    value={formData.tripId}
                    onChange={(e) => {
                      const trip = trips.find((t) => t.id === e.target.value);
                      setFormData({
                        ...formData,
                        tripId: e.target.value,
                        vehicleId: trip?.vehicleId || '',
                        vehicleNumber: trip?.vehicleNumber || '',
                      });
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                  >
                    <option value="" disabled>
                      Select a Trip
                    </option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.tripId} ({trip.origin} → {trip.destination})
                      </option>
                    ))}
                  </select>
                  {trips.length === 0 && (
                    <p className="text-[10px] text-red-500 font-bold mt-1">
                      No trips available. Create a trip first to add expenses.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {/* Existing Expenses Summary */}
                {formData.tripId && (
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
                          {expenses
                            .filter((e) => e.tripId === formData.tripId)
                            .map((e, i) => (
                              <tr key={i} className="text-amber-800">
                                <td className="py-1 font-medium">{e.category}</td>
                                <td className="py-1">₹{e.amount}</td>
                                <td className="py-1">{new Date(e.date).toLocaleDateString()}</td>
                              </tr>
                            ))}
                          {expenses.filter((e) => e.tripId === formData.tripId).length === 0 && (
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
                )}

                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-700">Expense Items</label>
                  {!editingExpense && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpenseItems([
                          ...expenseItems,
                          { category: 'Fuel', amount: 0, description: '' },
                        ])
                      }
                      className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Another Expense
                    </button>
                  )}
                </div>

                {expenseItems.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 relative"
                  >
                    {expenseItems.length > 1 && !editingExpense && (
                      <button
                        type="button"
                        onClick={() =>
                          setExpenseItems(expenseItems.filter((_, i) => i !== index))
                        }
                        className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Category
                        </label>
                        <select
                          required
                          value={item.category}
                          onChange={(e) => {
                            const newItems = expenseItems.map((it, i) =>
                              i === index ? { ...it, category: e.target.value } : it
                            );
                            setExpenseItems(newItems);
                            if (editingExpense)
                              setFormData({ ...formData, category: e.target.value as any });
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                        >
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Amount (₹)
                        </label>
                        <input
                          required
                          type="number"
                          value={isNaN(item.amount) ? '' : item.amount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            const newAmount = isNaN(val) ? 0 : val;
                            const newItems = expenseItems.map((it, i) =>
                              i === index ? { ...it, amount: newAmount } : it
                            );
                            setExpenseItems(newItems);
                            if (editingExpense)
                              setFormData({ ...formData, amount: newAmount });
                          }}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase">
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
                          if (editingExpense)
                            setFormData({ ...formData, description: e.target.value });
                        }}
                        placeholder="Notes..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-4 px-6 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving...
                    </>
                  ) : editingExpense ? (
                    'Update Expense'
                  ) : (
                    'Save Expense'
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
