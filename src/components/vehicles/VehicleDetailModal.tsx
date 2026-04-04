import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Shield,
  FileText,
  Activity,
  Calendar,
  Truck,
  User,
  Phone,
  CreditCard,
  Package,
  IndianRupee,
  X,
} from 'lucide-react';
import type { Vehicle, Driver, Shipment, Expense } from '../../types';
import { cn } from '../../utils/cn';

export interface VehicleDetailModalProps {
  isOpen: boolean;
  vehicle: Vehicle | null;
  driver: Driver | null;
  shipments: Shipment[];
  expenses: Expense[];
  onClose: () => void;
}

/** Returns days remaining until the expiry date, negative if already expired, null if no date.
 *  Uses UTC noon to avoid timezone drift for IST (UTC+5:30) users. */
export function getDaysRemaining(dateStr: string | undefined): number | null {
  if (!dateStr) return null;
  const expiryDate = new Date(dateStr);
  if (isNaN(expiryDate.getTime())) return null;
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const expiryUtc = Date.UTC(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
  return Math.floor((expiryUtc - todayUtc) / (1000 * 60 * 60 * 24));
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-xs text-slate-400 font-medium">N/A</span>;
  if (days < 0) return (
    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-black uppercase tracking-wider">
      EXPIRED
    </span>
  );
  if (days < 15) return (
    <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-full text-[10px] font-bold">
      {days} days
    </span>
  );
  if (days < 30) return (
    <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold">
      {days} days
    </span>
  );
  return (
    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold">
      {days} days
    </span>
  );
}

function StatusBadge({ status }: { status: Shipment['status'] }) {
  const map: Record<Shipment['status'], string> = {
    'pending': 'bg-slate-100 text-slate-600',
    'in-transit': 'bg-blue-50 text-blue-600',
    'delivered': 'bg-emerald-50 text-emerald-600',
    'cancelled': 'bg-red-50 text-red-500',
  };
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase', map[status])}>
      {status}
    </span>
  );
}

const COMPLIANCE_ROWS = [
  { label: 'Insurance', field: 'insuranceExpiry' as const, Icon: Shield },
  { label: 'Permit',    field: 'permitExpiry'    as const, Icon: FileText },
  { label: 'Fitness',   field: 'fitnessExpiry'   as const, Icon: Activity },
  { label: 'PUC',       field: 'pucExpiry'       as const, Icon: Calendar },
];

export default function VehicleDetailModal({
  isOpen,
  vehicle,
  driver,
  shipments,
  expenses,
  onClose,
}: VehicleDetailModalProps) {
  if (!isOpen || !vehicle) return null;

  const recentShipments = [...shipments]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 5);

  const recentExpenses = [...expenses]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // Total across all expenses for this vehicle (not just the visible 5)
  const expenseTotal = expenses.reduce((sum, e) => sum + e.amount, 0);

  const formatAmount = (n: number) =>
    n.toLocaleString('en-IN', { maximumFractionDigits: 0 });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="vehicle-detail-title"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                  <Truck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 id="vehicle-detail-title" className="text-xl font-black text-slate-900 tracking-tight">
                    {vehicle.plateNumber}
                  </h2>
                  <p className="text-sm text-slate-500">{vehicle.vehicleType}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={cn(
                  'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider',
                  vehicle.status === 'active'      && 'bg-emerald-50 text-emerald-700',
                  vehicle.status === 'maintenance' && 'bg-orange-50 text-orange-600',
                  vehicle.status === 'inactive'    && 'bg-slate-100 text-slate-500',
                )}>
                  {vehicle.status}
                </span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">

              {/* Assigned Driver */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                  Assigned Driver
                </h3>
                {driver ? (
                  <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{driver.name}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />{driver.phone ?? 'N/A'}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <CreditCard className="w-3 h-3" />{driver.licenseNumber}
                        </span>
                      </div>
                    </div>
                    <span className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0',
                      driver.status === 'available' && 'bg-emerald-50 text-emerald-600',
                      driver.status === 'on-trip'   && 'bg-blue-50 text-blue-600',
                      driver.status === 'off-duty'  && 'bg-slate-100 text-slate-500',
                    )}>
                      {driver.status}
                    </span>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl p-4 text-center text-sm text-slate-400 font-medium">
                    No driver assigned
                  </div>
                )}
              </section>

              {/* Compliance */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                  Compliance
                </h3>
                <div className="bg-slate-50 rounded-2xl divide-y divide-slate-100">
                  {COMPLIANCE_ROWS.map(({ label, field, Icon }) => {
                    const days = getDaysRemaining(vehicle[field]);
                    const dateStr = vehicle[field]
                      ? new Date(vehicle[field]!).toLocaleDateString()
                      : null;
                    return (
                      <div key={label} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm font-semibold text-slate-700">{label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {dateStr ? (
                            <>
                              <span className="text-xs text-slate-500">{dateStr}</span>
                              <ExpiryBadge days={days} />
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">N/A</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Recent Shipments */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                  Recent Shipments
                </h3>
                {recentShipments.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-4 text-center text-sm text-slate-400 font-medium">
                    No shipments found for this vehicle.
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl divide-y divide-slate-100">
                    {recentShipments.map((s) => (
                      <div key={s.id} className="flex items-center justify-between px-4 py-3 gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <Package className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900">{s.tripId}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {s.origin} → {s.destination}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={s.status} />
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Recent Expenses */}
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                  Recent Expenses
                </h3>
                {recentExpenses.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-4 text-center text-sm text-slate-400 font-medium">
                    No expenses recorded.
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-2xl overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {recentExpenses.map((e) => (
                        <div key={e.id} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <IndianRupee className="w-4 h-4 text-slate-400 shrink-0" />
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{e.category}</p>
                              <p className="text-xs text-slate-400">{e.date}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">
                              ₹{formatAmount(e.amount)}
                            </p>
                            <span className={cn(
                              'text-[10px] font-bold uppercase',
                              e.status === 'paid'    ? 'text-emerald-600' : 'text-amber-500',
                            )}>
                              {e.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-100 border-t border-slate-200">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-500">
                        Lifetime Total
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        ₹{formatAmount(expenseTotal)}
                      </span>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 shrink-0">
              <button
                onClick={onClose}
                className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
