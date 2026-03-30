import React, { useState, useEffect } from 'react';
import { Driver } from '../types';
import { apiFetch } from '../lib/api';
import { cn } from '../utils/cn';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Activity,
  Truck,
  Phone,
  CreditCard,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<Driver, 'id'>>({
    name: '',
    phone: '',
    licenseNumber: '',
    status: 'available',
    bankAccount: '',
    ifsc: '',
    upiId: ''
  });

  const fetchDrivers = async () => {
    try {
      const driverList = await apiFetch('/api/drivers');
      setDrivers(driverList);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingDriver) {
        await apiFetch(`/api/drivers/${editingDriver.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
      } else {
        await apiFetch('/api/drivers', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      await fetchDrivers();
      closeModal();
    } catch (err) {
      console.error('Error saving driver:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/drivers/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      await fetchDrivers();
    } catch (err) {
      console.error('Error deleting driver:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData({
        name: driver.name,
        phone: driver.phone || '',
        licenseNumber: driver.licenseNumber,
        status: driver.status,
        bankAccount: driver.bankAccount || '',
        ifsc: driver.ifsc || '',
        upiId: driver.upiId || ''
      });
    } else {
      setEditingDriver(null);
      setFormData({
        name: '',
        phone: '',
        licenseNumber: '',
        status: 'available',
        bankAccount: '',
        ifsc: '',
        upiId: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
    setFormData({
      name: '',
      phone: '',
      licenseNumber: '',
      status: 'available',
      bankAccount: '',
      ifsc: '',
      upiId: ''
    });
  };

  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.phone && d.phone.includes(searchTerm))
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-accent/10 text-accent border-accent/20';
      case 'on-trip': return 'bg-primary/10 text-primary border-primary/20';
      case 'off-duty': return 'bg-slate-100 text-slate-600 border-slate-200';
      default: return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'on-trip': return <Clock className="w-3.5 h-3.5" />;
      case 'off-duty': return <AlertTriangle className="w-3.5 h-3.5" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Driver Registry</h1>
          <p className="text-slate-500 mt-1">Manage your driver fleet, contact info, and status.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-5 h-5" />
          Add Driver
        </button>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by name, phone, or license..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2">
          {['available', 'on-trip', 'off-duty'].map((s) => (
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

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse">
              <div className="w-12 h-12 bg-slate-100 rounded-2xl mb-4" />
              <div className="h-6 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))
        ) : filteredDrivers.length === 0 ? (
          <div className="col-span-full py-20 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No drivers found</h3>
            <p className="text-slate-500 mt-1">Try adjusting your search or add a new driver.</p>
          </div>
        ) : (
          filteredDrivers.map((driver) => (
            <motion.div
              key={driver.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-slate-200">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => openModal(driver)}
                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteId(driver.id!)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-slate-900 tracking-tight">{driver.name}</h3>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{driver.phone || 'No phone added'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <CreditCard className="w-4 h-4 text-slate-400" />
                  <span>{driver.licenseNumber}</span>
                </div>
                {driver.currentVehicleNumber && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Truck className="w-4 h-4 text-slate-400" />
                    <span className="font-bold text-primary">Vehicle: {driver.currentVehicleNumber}</span>
                  </div>
                )}
                {driver.upiId && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Activity className="w-4 h-4 text-slate-400" />
                    <span>UPI: {driver.upiId}</span>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                <div className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${getStatusColor(driver.status)}`}>
                  {getStatusIcon(driver.status)}
                  <span>{driver.status}</span>
                </div>
                <button className="text-primary text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all">
                  Profile <ChevronRight className="w-3.5 h-3.5" />
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
                  {editingDriver ? 'Edit Driver' : 'Add New Driver'}
                </h2>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Full Name</label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Phone Number</label>
                    <input 
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="e.g. +91 9876543210"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">License Number</label>
                    <input 
                      required
                      type="text"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      placeholder="e.g. DL-142011"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Bank Account Number</label>
                    <input 
                      type="text"
                      value={formData.bankAccount}
                      onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                      placeholder="e.g. 1234567890"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">IFSC Code</label>
                    <input 
                      type="text"
                      value={formData.ifsc}
                      onChange={(e) => setFormData({ ...formData, ifsc: e.target.value })}
                      placeholder="e.g. SBIN0001234"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">UPI ID</label>
                  <input 
                    type="text"
                    value={formData.upiId}
                    onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                    placeholder="e.g. rahul@upi"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Current Status</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'available', icon: CheckCircle2, color: 'accent' },
                      { id: 'on-trip', icon: Clock, color: 'primary' },
                      { id: 'off-duty', icon: AlertTriangle, color: 'slate' }
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
                      editingDriver ? 'Update Driver' : 'Save Driver'
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
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Driver?</h3>
              <p className="text-slate-500 mb-8 text-sm">This action cannot be undone. Are you sure you want to remove this driver from your registry?</p>
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
