import React from 'react';
import {
  Truck,
  IndianRupee,
  ChevronRight,
  MapPin,
  Users,
  FileText,
  Package,
  CreditCard,
  Wallet,
  CheckCircle2,
  Edit2,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Expense } from '../../types';
import { cn } from '../../utils/cn';

interface TripGroup {
  tripId: string;
  tripDetails?: any;
  expenses: Expense[];
}

interface VehicleGroup {
  vehicleNumber: string;
  vehicleId?: string;
  total: number;
  trips: Record<string, TripGroup>;
}

export interface ExpenseVehicleGroupProps {
  vehicle: VehicleGroup;
  isExpanded: boolean;
  activeTab: 'pending' | 'paid';
  onToggle: (vehicleNumber: string) => void;
  onPayVehicle: (vehicleNumber: string) => void;
  onMarkAsPaid: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

export function ExpenseVehicleGroup({
  vehicle,
  isExpanded,
  activeTab,
  onToggle,
  onPayVehicle,
  onMarkAsPaid,
  onEdit,
  onDelete,
}: ExpenseVehicleGroupProps) {
  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
      <button
        onClick={() => onToggle(vehicle.vehicleNumber)}
        className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Truck className="w-6 h-6 text-slate-600" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold text-slate-900">{vehicle.vehicleNumber}</h3>
            <p className="text-xs text-slate-500">
              {Object.keys(vehicle.trips).length} Trips •{' '}
              {Object.values(vehicle.trips).reduce((sum, t) => sum + t.expenses.length, 0)} Expenses
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          {activeTab === 'pending' && vehicle.total > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPayVehicle(vehicle.vehicleNumber);
              }}
              className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all"
              title="Pay Vehicle Expenses"
            >
              <IndianRupee className="w-5 h-5" />
            </button>
          )}
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vehicle Total</p>
            <p className="text-xl font-black text-slate-900">₹{vehicle.total.toLocaleString('en-IN')}</p>
          </div>
          <ChevronRight
            className={cn('w-5 h-5 text-slate-400 transition-transform', isExpanded && 'rotate-90')}
          />
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t border-slate-50"
          >
            <div className="p-6 space-y-8">
              {Object.values(vehicle.trips).map((trip) => (
                <div
                  key={trip.tripId}
                  className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-primary rounded-full" />
                        <h4 className="font-bold text-slate-900">
                          {trip.tripId === 'General'
                            ? 'General Expenses'
                            : `Trip #${trip.tripDetails?.tripId || trip.tripId.slice(-6).toUpperCase()}`}
                        </h4>
                        {trip.tripDetails && (
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                              trip.tripDetails.status === 'delivered'
                                ? 'bg-accent/10 text-accent'
                                : trip.tripDetails.status === 'in-transit'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-slate-100 text-slate-500'
                            )}
                          >
                            {trip.tripDetails.status}
                          </span>
                        )}
                      </div>
                      {trip.tripDetails && (
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {trip.tripDetails.origin} → {trip.tripDetails.destination}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {trip.tripDetails.driverName}
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            <span className="font-bold">Billing:</span> {trip.tripDetails.companyName}
                          </div>
                          {trip.tripDetails.containerNumber && (
                            <div className="flex items-center gap-1">
                              <Package className="w-3 h-3" />
                              {trip.tripDetails.containerNumber}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trip Total</p>
                      <p className="text-lg font-black text-primary">
                        ₹{trip.expenses
                          .reduce((sum, e) => sum + e.amount, 0)
                          .toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-100 shadow-sm">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="px-4 py-3 text-[10px] font-bold text-primary uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-primary uppercase tracking-wider">Category</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-primary uppercase tracking-wider">Payment</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-primary uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-[10px] font-bold text-primary uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {trip.expenses.map((expense) => (
                          <tr key={expense.id} className="group">
                            <td className="px-4 py-4 text-sm text-slate-600">
                              {new Date(expense.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-slate-900">{expense.category}</span>
                                {expense.description && (
                                  <span className="text-xs text-slate-400 truncate max-w-[150px]">
                                    {expense.description}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                {expense.paymentMethod === 'online' ? (
                                  <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                                ) : (
                                  <Wallet className="w-3.5 h-3.5 text-emerald-500" />
                                )}
                                <span className="text-xs text-slate-600 capitalize">
                                  {expense.paymentMethod}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm font-bold text-slate-900">
                              ₹{expense.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {activeTab === 'pending' && (
                                  <button
                                    onClick={() => onMarkAsPaid(expense)}
                                    className="p-1.5 text-accent bg-accent/5 hover:bg-accent/10 rounded-lg transition-all"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => onEdit(expense)}
                                  className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-all"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => onDelete(expense.id!)}
                                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
