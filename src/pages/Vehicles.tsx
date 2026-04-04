import React, { useState } from 'react';
import { Vehicle, Driver } from '../types';
import { apiFetch } from '../lib/api';
import { cn } from '../utils/cn';
import { useToast } from '../contexts/ToastContext';
import { parseApiError } from '../lib/parseApiError';
import { 
  Truck, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  FileText,
  Activity,
  Calendar,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useData } from '../contexts/DataContext';

export default function Vehicles() {
  const { showToast } = useToast();
  const { vehicles, drivers, loading, refetch: fetchData } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<Vehicle, 'id'>>({
    plateNumber: '',
    vehicleType: '',
    status: 'active',
    insuranceExpiry: '',
    permitExpiry: '',
    fitnessExpiry: '',
    pucExpiry: '',
    currentDriverId: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let vehicleId: string | undefined;
      if (editingVehicle) {
        const updated = await apiFetch(`/api/vehicles/${editingVehicle.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
        vehicleId = updated.id;
      } else {
        const created = await apiFetch('/api/vehicles', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        vehicleId = created.id;
      }

      // Update bi-directional driver mapping
      if (formData.currentDriverId) {
        const driver = drivers.find(d => d.id === formData.currentDriverId);
        if (driver) {
          await apiFetch(`/api/drivers/${driver.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ currentVehicleId: vehicleId, currentVehicleNumber: formData.plateNumber }),
          });
        }
      }

      // Clear old driver's vehicle link if driver changed
      if (editingVehicle?.currentDriverId && editingVehicle.currentDriverId !== formData.currentDriverId) {
        await apiFetch(`/api/drivers/${editingVehicle.currentDriverId}`, {
          method: 'PATCH',
          body: JSON.stringify({ currentVehicleId: null, currentVehicleNumber: null }),
        });
      }

      await fetchData();
      closeModal();
      showToast(editingVehicle ? 'Vehicle updated.' : 'Vehicle added.', 'success');
    } catch (err) {
      showToast(parseApiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/vehicles/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      await fetchData();
      showToast('Vehicle deleted.', 'success');
    } catch (err) {
      showToast(parseApiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData({
        plateNumber: vehicle.plateNumber,
        vehicleType: vehicle.vehicleType,
        status: vehicle.status,
        insuranceExpiry: vehicle.insuranceExpiry || '',
        permitExpiry: vehicle.permitExpiry || '',
        fitnessExpiry: vehicle.fitnessExpiry || '',
        pucExpiry: vehicle.pucExpiry || '',
        currentDriverId: vehicle.currentDriverId || ''
      });
    } else {
      setEditingVehicle(null);
      setFormData({
        plateNumber: '',
        vehicleType: '',
        status: 'active',
        insuranceExpiry: '',
        permitExpiry: '',
        fitnessExpiry: '',
        pucExpiry: '',
        currentDriverId: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
    setFormData({
      plateNumber: '',
      vehicleType: '',
      status: 'active',
      insuranceExpiry: '',
      permitExpiry: '',
      fitnessExpiry: '',
      pucExpiry: '',
      currentDriverId: ''
    });
  };

  const filteredVehicles = vehicles.filter(v => 
    v.plateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.vehicleType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-accent/10 text-accent border-accent/20';
      case 'maintenance': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'inactive': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'maintenance': return <Clock className="w-3.5 h-3.5" />;
      case 'inactive': return <AlertTriangle className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  const isExpiringSoon = (date: string) => {
    if (!date) return false;
    const expiry = new Date(date);
    const today = new Date();
    const diff = expiry.getTime() - today.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return days < 15;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Fleet Management</h1>
          <p className="text-slate-500 mt-1">Monitor vehicle health, compliance, and availability.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Add Vehicle
        </button>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by plate number or model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['active', 'maintenance', 'inactive'].map((s) => (
            <button
              key={s}
              onClick={() => setSearchTerm(s === searchTerm ? '' : s)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold border transition-all capitalize whitespace-nowrap",
                searchTerm === s
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl mb-4" />
              <div className="h-6 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))
        ) : filteredVehicles.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Truck className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No vehicles found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your search or add a new vehicle.</p>
          </div>
        ) : (
          filteredVehicles.map((vehicle) => (
            <motion.div
              key={vehicle.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openModal(vehicle)}
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteId(vehicle.id!)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{vehicle.plateNumber}</h3>
              <p className="text-slate-500 text-sm font-medium mt-1">{vehicle.vehicleType}</p>
              
              <div className="mt-6 space-y-3">
                <div className={`flex items-center justify-between p-2 rounded-lg ${isExpiringSoon(vehicle.insuranceExpiry!) ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Shield className={`w-3.5 h-3.5 ${isExpiringSoon(vehicle.insuranceExpiry!) ? 'text-red-500' : 'text-slate-400'}`} />
                    <span>Insurance</span>
                  </div>
                  <span className={`text-xs font-bold ${isExpiringSoon(vehicle.insuranceExpiry!) ? 'text-red-600' : 'text-slate-900'}`}>
                    {vehicle.insuranceExpiry ? new Date(vehicle.insuranceExpiry).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                <div className={`flex items-center justify-between p-2 rounded-lg ${isExpiringSoon(vehicle.permitExpiry!) ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <FileText className={`w-3.5 h-3.5 ${isExpiringSoon(vehicle.permitExpiry!) ? 'text-red-500' : 'text-slate-400'}`} />
                    <span>Permit</span>
                  </div>
                  <span className={`text-xs font-bold ${isExpiringSoon(vehicle.permitExpiry!) ? 'text-red-600' : 'text-slate-900'}`}>
                    {vehicle.permitExpiry ? new Date(vehicle.permitExpiry).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                <div className={`flex items-center justify-between p-2 rounded-lg ${isExpiringSoon(vehicle.fitnessExpiry!) ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Activity className={`w-3.5 h-3.5 ${isExpiringSoon(vehicle.fitnessExpiry!) ? 'text-red-500' : 'text-slate-400'}`} />
                    <span>Fitness</span>
                  </div>
                  <span className={`text-xs font-bold ${isExpiringSoon(vehicle.fitnessExpiry!) ? 'text-red-600' : 'text-slate-900'}`}>
                    {vehicle.fitnessExpiry ? new Date(vehicle.fitnessExpiry).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                <div className={`flex items-center justify-between p-2 rounded-lg ${isExpiringSoon(vehicle.pucExpiry!) ? 'bg-red-50' : 'bg-slate-50'}`}>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <Calendar className={`w-3.5 h-3.5 ${isExpiringSoon(vehicle.pucExpiry!) ? 'text-red-500' : 'text-slate-400'}`} />
                    <span>PUC</span>
                  </div>
                  <span className={`text-xs font-bold ${isExpiringSoon(vehicle.pucExpiry!) ? 'text-red-600' : 'text-slate-900'}`}>
                    {vehicle.pucExpiry ? new Date(vehicle.pucExpiry).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${getStatusColor(vehicle.status)}`}>
                  {getStatusIcon(vehicle.status)}
                  <span>{vehicle.status}</span>
                </div>
                <button className="text-primary text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all">
                  Details <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                </h2>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Plate Number</label>
                    <input 
                      required
                      type="text"
                      value={formData.plateNumber}
                      onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                      placeholder="e.g. MH 12 AB 1234"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Vehicle Type</label>
                    <select 
                      required
                      value={formData.vehicleType}
                      onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    >
                      <option value="">Select Type</option>
                      <option value="20 ft">20 ft</option>
                      <option value="40 ft">40 ft</option>
                      <option value="40 HC">40 HC</option>
                      <option value="Trailer">Trailer</option>
                      <option value="Truck">Truck</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Primary Driver</label>
                    <select 
                      value={formData.currentDriverId}
                      onChange={(e) => setFormData({ ...formData, currentDriverId: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    >
                      <option value="">Select Driver</option>
                      {drivers.filter(d => d.status === 'available' || d.id === formData.currentDriverId).map(driver => (
                        <option key={driver.id} value={driver.id}>{driver.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Operational Status</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'active', icon: CheckCircle2, color: 'accent' },
                      { id: 'maintenance', icon: Clock, color: 'orange' },
                      { id: 'inactive', icon: AlertTriangle, color: 'slate' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s.id as any })}
                        className={cn(
                          "flex flex-col items-center gap-2 py-4 px-2 rounded-2xl text-[10px] font-bold border transition-all capitalize",
                          formData.status === s.id 
                            ? `bg-${s.color}/10 text-${s.color} border-${s.color}/20 ring-2 ring-${s.color}/10` 
                            : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <s.icon className="w-5 h-5" />
                        {s.id}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Compliance Dates</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Enter the expiry dates for each document.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-slate-400" />
                      Insurance Expiry Date
                    </label>
                    <input 
                      type="date"
                      value={formData.insuranceExpiry}
                      onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      Permit Expiry Date
                    </label>
                    <input 
                      type="date"
                      value={formData.permitExpiry}
                      onChange={(e) => setFormData({ ...formData, permitExpiry: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-slate-400" />
                      Fitness Expiry Date
                    </label>
                    <input 
                      type="date"
                      value={formData.fitnessExpiry}
                      onChange={(e) => setFormData({ ...formData, fitnessExpiry: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <Activity className="w-4 h-4 text-slate-400" />
                      PUC Expiry Date
                    </label>
                    <input 
                      type="date"
                      value={formData.pucExpiry}
                      onChange={(e) => setFormData({ ...formData, pucExpiry: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="pt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
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
                    ) : (
                      editingVehicle ? 'Update Vehicle' : 'Save Vehicle'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Vehicle?</h3>
              <p className="text-slate-500 mb-8 text-sm">This action cannot be undone. Are you sure you want to remove this vehicle from your fleet?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Removed local cn function
