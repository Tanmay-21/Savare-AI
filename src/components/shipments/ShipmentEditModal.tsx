import React from 'react';
import { X, Loader2, Clock, MapPin, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shipment, Vehicle, Driver } from '../../types';
import { cn } from '../../utils/cn';

export interface ShipmentEditModalProps {
  isOpen: boolean;
  editingShipment: Shipment | null;
  formData: Omit<Shipment, 'id'>;
  setFormData: React.Dispatch<React.SetStateAction<Omit<Shipment, 'id'>>>;
  vehicles: Vehicle[];
  drivers: Driver[];
  suggestedRoutes: { origin: string; destination: string }[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onVehicleChange: (vehicleId: string) => void;
  onCompanyChange: (billingPartyName: string) => void;
}

const STATUSES = [
  { id: 'pending', icon: Clock, color: 'orange' },
  { id: 'in-transit', icon: MapPin, color: 'blue' },
  { id: 'delivered', icon: CheckCircle2, color: 'emerald' },
  { id: 'cancelled', icon: AlertTriangle, color: 'red' },
] as const;

export function ShipmentEditModal({
  isOpen,
  editingShipment,
  formData,
  setFormData,
  vehicles,
  drivers,
  suggestedRoutes,
  submitting,
  onClose,
  onSubmit,
  onVehicleChange,
  onCompanyChange,
}: ShipmentEditModalProps) {
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
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Edit Trip Details</h2>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form
              onSubmit={onSubmit}
              className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh]"
            >
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Trip ID</label>
                <div className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 font-bold">
                  {formData.tripId || 'Auto-generating...'}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Billing Party</label>
                <input
                  required
                  disabled={!!editingShipment?.orderId || editingShipment?.isLocked}
                  type="text"
                  value={formData.billingPartyName}
                  onChange={(e) => onCompanyChange(e.target.value)}
                  placeholder="Search or enter billing party..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                />
                {suggestedRoutes.length > 0 && (
                  <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                      Suggested Routes
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {suggestedRoutes.map((route, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              origin: route.origin,
                              destination: route.destination,
                            })
                          }
                          className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded-lg hover:border-primary transition-all"
                        >
                          {route.origin} → {route.destination}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Consignee Name</label>
                <input
                  required
                  disabled={!!editingShipment?.orderId || editingShipment?.isLocked}
                  type="text"
                  value={formData.consigneeName}
                  onChange={(e) => setFormData({ ...formData, consigneeName: e.target.value })}
                  placeholder="Enter consignee name..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Origin</label>
                <input
                  required
                  disabled={!!editingShipment?.orderId || editingShipment?.isLocked}
                  type="text"
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Destination</label>
                <input
                  required
                  disabled={!!editingShipment?.orderId || editingShipment?.isLocked}
                  type="text"
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Vehicle</label>
                <select
                  disabled={editingShipment?.isLocked}
                  value={formData.vehicleId}
                  onChange={(e) => onVehicleChange(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                >
                  <option value="">Select Vehicle</option>
                  {vehicles
                    .filter((v) => v.isAvailable !== false || v.id === formData.vehicleId)
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plateNumber} ({v.vehicleType})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Driver</label>
                <select
                  disabled={editingShipment?.isLocked}
                  value={formData.driverId}
                  onChange={(e) => {
                    const driver = drivers.find((d) => d.id === e.target.value);
                    setFormData({
                      ...formData,
                      driverId: e.target.value,
                      driverName: driver?.name || '',
                    });
                  }}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                >
                  <option value="">Select Driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Container Number</label>
                <input
                  required
                  disabled={editingShipment?.isLocked}
                  type="text"
                  value={formData.containerNumber}
                  onChange={(e) => setFormData({ ...formData, containerNumber: e.target.value })}
                  placeholder="e.g. MSKU1234567"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Container Size</label>
                <select
                  disabled={!!editingShipment?.orderId || editingShipment?.isLocked}
                  value={formData.containerSize}
                  onChange={(e) =>
                    setFormData({ ...formData, containerSize: e.target.value as any })
                  }
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                >
                  <option value="20 ft">20 ft</option>
                  <option value="40 ft">40 ft</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Seal Number (Optional)</label>
                <input
                  disabled={editingShipment?.isLocked}
                  type="text"
                  value={formData.sealNumber}
                  onChange={(e) => setFormData({ ...formData, sealNumber: e.target.value })}
                  placeholder="e.g. SEAL123"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">LOLO Toggle</label>
                <div className="flex items-center gap-4 py-3">
                  <button
                    type="button"
                    disabled={!!editingShipment?.orderId || editingShipment?.isLocked}
                    onClick={() => setFormData({ ...formData, isLolo: true })}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-bold border transition-all',
                      formData.isLolo
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-500 border-slate-200'
                    )}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    disabled={!!editingShipment?.orderId || editingShipment?.isLocked}
                    onClick={() => setFormData({ ...formData, isLolo: false, yardSelection: '' })}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-bold border transition-all',
                      !formData.isLolo
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-500 border-slate-200'
                    )}
                  >
                    No
                  </button>
                </div>
              </div>

              {formData.isLolo && (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Yard Selection</label>
                  <input
                    required
                    disabled={!!editingShipment?.orderId || editingShipment?.isLocked}
                    type="text"
                    value={formData.yardSelection}
                    onChange={(e) => setFormData({ ...formData, yardSelection: e.target.value })}
                    placeholder="Enter yard name..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                  />
                </div>
              )}

              <div className="col-span-full space-y-3">
                <label className="text-sm font-bold text-slate-700">Trip Status</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {STATUSES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, status: s.id as any })}
                      className={cn(
                        'flex flex-col items-center gap-2 py-4 px-2 rounded-2xl text-[10px] font-bold border transition-all capitalize',
                        formData.status === s.id
                          ? `bg-${s.color}-50 text-${s.color}-600 border-${s.color}-200 ring-2 ring-${s.color}-500/20`
                          : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'
                      )}
                    >
                      <s.icon className="w-5 h-5" />
                      {s.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Est. Arrival</label>
                <input
                  type="datetime-local"
                  value={formData.estimatedArrival}
                  onChange={(e) => setFormData({ ...formData, estimatedArrival: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Actual Arrival</label>
                <input
                  type="datetime-local"
                  value={formData.actualArrival}
                  onChange={(e) => setFormData({ ...formData, actualArrival: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                />
              </div>

              <div className="col-span-full pt-4 flex gap-3">
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
                  ) : editingShipment ? (
                    'Update Trip'
                  ) : (
                    'Create Trip'
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
