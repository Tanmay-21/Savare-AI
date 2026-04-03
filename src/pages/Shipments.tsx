import React, { useState, useEffect } from 'react';
import { Shipment } from '../types';
import { apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { parseApiError } from '../lib/parseApiError';
import { useShipmentsData } from '../hooks/useShipmentsData';
import {
  downloadDailyReport,
  downloadAnnexureReport,
  downloadLR
} from '../utils/reportGenerator';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  MapPin,
  ArrowRight,
  Loader2,
  Truck,
  IndianRupee,
  FileSpreadsheet,
  Calendar,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Order } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { ShipmentEditModal } from '../components/shipments/ShipmentEditModal';
import { TripExpenseModal, type TripExpenseItem } from '../components/shipments/TripExpenseModal';

export default function Shipments() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { shipments, vehicles, drivers, expenses, orders, loading, fetchData, fetchErrorShown } = useShipmentsData(showToast);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnnexureModalOpen, setIsAnnexureModalOpen] = useState(false);
  const [annexureDateRange, setAnnexureDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportDateRange, setReportDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [activeTab, setActiveTab] = useState<Shipment['status']>('pending');
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Omit<Shipment, 'id'>>({
    tripId: '',
    containerNumber: '',
    containerSize: '20 ft',
    origin: '',
    destination: '',
    status: 'pending',
    vehicleId: '',
    vehicleNumber: '',
    driverId: '',
    driverName: '',
    estimatedArrival: '',
    actualArrival: '',
    billingPartyName: '',
    consigneeName: '',
    isLolo: false,
    yardSelection: '',
    movementType: 'Import',
    sealNumber: '',
    isLocked: false,
    isBillingSameAsConsignee: false
  });

  const [suggestedRoutes, setSuggestedRoutes] = useState<{origin: string, destination: string}[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedTripForExpense, setSelectedTripForExpense] = useState<Shipment | null>(null);
  const [expenseItems, setExpenseItems] = useState<TripExpenseItem[]>([{ category: 'Fuel', amount: '', description: '' }]);

  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = vehicles.find(v => v.id === vehicleId);
    if (vehicle) {
      const driver = drivers.find(d => d.id === vehicle.currentDriverId);
      setFormData(prev => ({
        ...prev,
        vehicleId,
        vehicleNumber: vehicle.plateNumber,
        driverId: driver?.id || '',
        driverName: driver?.name || '',
        status: prev.status === 'pending' ? 'in-transit' : prev.status
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vehicleId: '',
        vehicleNumber: '',
        driverId: '',
        driverName: ''
      }));
    }
  };

  const handleCompanyChange = (billingPartyName: string) => {
    const previousTrips = shipments.filter(s => s.billingPartyName === billingPartyName);
    const routes = previousTrips.map(s => ({ origin: s.origin, destination: s.destination }));
    const uniqueRoutes = Array.from(new Set(routes.map(r => JSON.stringify(r)))).map((r: string) => JSON.parse(r));
    setSuggestedRoutes(uniqueRoutes);
    setFormData(prev => ({ ...prev, billingPartyName }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const updatedFormData = {
        ...formData,
        updatedAt: now
      };

      if (updatedFormData.status === 'delivered' && editingShipment.status !== 'delivered') {
        if (!updatedFormData.actualArrival) {
          updatedFormData.actualArrival = now;
        }
        setSelectedTripForExpense({ ...editingShipment, ...updatedFormData });
        setExpenseItems([{ category: 'Fuel', amount: '', description: '' }]);
        setIsExpenseModalOpen(true);

        if (updatedFormData.vehicleId) {
          await apiFetch(`/api/vehicles/${updatedFormData.vehicleId}`, {
            method: 'PATCH', body: JSON.stringify({ isAvailable: true }),
          });
        }
      } else if (updatedFormData.status === 'in-transit' && editingShipment.status !== 'in-transit') {
        if (updatedFormData.vehicleId) {
          await apiFetch(`/api/vehicles/${updatedFormData.vehicleId}`, {
            method: 'PATCH', body: JSON.stringify({ isAvailable: false }),
          });
        }
      }

      if (updatedFormData.vehicleId !== editingShipment.vehicleId) {
        if (editingShipment.vehicleId) {
          await apiFetch(`/api/vehicles/${editingShipment.vehicleId}`, {
            method: 'PATCH', body: JSON.stringify({ isAvailable: true }),
          });
        }
        if (updatedFormData.vehicleId && updatedFormData.status === 'in-transit') {
          await apiFetch(`/api/vehicles/${updatedFormData.vehicleId}`, {
            method: 'PATCH', body: JSON.stringify({ isAvailable: false }),
          });
        }
      }

      await apiFetch(`/api/shipments/${editingShipment.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedFormData),
      });
      await fetchData();
      fetchErrorShown.current = false;
      closeModal();
      showToast('Shipment updated.', 'success');
    } catch (err) {
      console.error('Error updating shipment:', err);
      showToast(parseApiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripForExpense) return;
    setSubmitting(true);
    try {
      for (const item of expenseItems) {
        if (Number(item.amount) > 0) {
          await apiFetch('/api/expenses', {
            method: 'POST',
            body: JSON.stringify({
              tripId: selectedTripForExpense.id,
              vehicleId: selectedTripForExpense.vehicleId,
              vehicleNumber: selectedTripForExpense.vehicleNumber,
              driverId: selectedTripForExpense.driverId,
              driverName: selectedTripForExpense.driverName,
              category: item.category,
              amount: Number(item.amount),
              description: item.description,
              date: new Date().toISOString().split('T')[0],
              status: 'pending',
              paymentMethod: 'online',
            }),
          });
        }
      }

      await apiFetch(`/api/shipments/${selectedTripForExpense.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isLocked: true }),
      });

      await fetchData();
      setIsExpenseModalOpen(false);
      setSelectedTripForExpense(null);
      setExpenseItems([{ category: 'Fuel', amount: '', description: '' }]);
      showToast('Expenses saved for this trip.', 'success');
    } catch (err) {
      console.error('Error submitting expense:', err);
      showToast(parseApiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (shipment: Shipment) => {
    setEditingShipment(shipment);
    setFormData({
      tripId: shipment.tripId || '',
      containerNumber: shipment.containerNumber || '',
      containerSize: shipment.containerSize || '20 ft',
      origin: shipment.origin,
      destination: shipment.destination,
      status: shipment.status,
      vehicleId: shipment.vehicleId || '',
      vehicleNumber: shipment.vehicleNumber || '',
      driverId: shipment.driverId || '',
      driverName: shipment.driverName || '',
      estimatedArrival: shipment.estimatedArrival || '',
      actualArrival: shipment.actualArrival || '',
      billingPartyName: shipment.billingPartyName || '',
      consigneeName: shipment.consigneeName || '',
      isLolo: shipment.isLolo || false,
      yardSelection: shipment.yardSelection || '',
      movementType: shipment.movementType || 'Import',
      sealNumber: shipment.sealNumber || '',
      isLocked: shipment.isLocked || false,
      isBillingSameAsConsignee: shipment.isBillingSameAsConsignee || false
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingShipment(null);
    setFormData({
      tripId: '',
      containerNumber: '',
      containerSize: '20 ft',
      origin: '',
      destination: '',
      status: 'pending',
      vehicleId: '',
      vehicleNumber: '',
      driverId: '',
      driverName: '',
      estimatedArrival: '',
      actualArrival: '',
      billingPartyName: '',
      consigneeName: '',
      isLolo: false,
      yardSelection: '',
      movementType: 'Import',
      sealNumber: '',
      isLocked: false,
      isBillingSameAsConsignee: false
    });
    setSuggestedRoutes([]);
  };

  const filteredShipments = shipments.filter(s => {
    const matchesSearch =
      (s.tripId?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (s.origin?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (s.destination?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (s.containerNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (s.billingPartyName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesTab = s.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const counts = {
    pending: shipments.filter(s => s.status === 'pending').length,
    'in-transit': shipments.filter(s => s.status === 'in-transit').length,
    delivered: shipments.filter(s => s.status === 'delivered').length,
    cancelled: shipments.filter(s => s.status === 'cancelled').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-accent/10 text-accent border-accent/20';
      case 'in-transit': return 'bg-primary/10 text-primary border-primary/20';
      case 'pending': return 'bg-slate-100 text-slate-600 border-slate-200';
      case 'cancelled': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-zinc-100 text-zinc-600 border-zinc-200';
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Trip Management</h1>
          <p className="text-slate-500 mt-1">Manage container trips, LR generation, and tracking.</p>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={reportDateRange.start}
              onChange={(e) => setReportDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="text-xs font-bold text-slate-600 focus:outline-none bg-transparent"
            />
            <span className="text-slate-300">-</span>
            <input
              type="date"
              value={reportDateRange.end}
              onChange={(e) => setReportDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="text-xs font-bold text-slate-600 focus:outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl p-1 shadow-sm">
            <button
              onClick={() => {
                const filtered = shipments.filter(s => {
                  const date = s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '';
                  return date >= reportDateRange.start && date <= reportDateRange.end;
                });
                downloadDailyReport(filtered, orders, expenses, 'excel');
              }}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all text-sm font-bold"
              title="Download Daily Report"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Daily Report
            </button>
            <div className="w-px h-4 bg-slate-200 mx-1" />
            <button
              onClick={() => setIsAnnexureModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all text-sm font-bold"
              title="Download Annexure"
            >
              <FileText className="w-4 h-4 text-primary" />
              Annexure
            </button>
          </div>
        </div>
      </header>

      {/* Shipment Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Pending', count: counts.pending, color: 'text-slate-600', bg: 'bg-slate-50', icon: Clock },
          { label: 'In Transit', count: counts['in-transit'], color: 'text-primary', bg: 'bg-primary/5', icon: Truck },
          { label: 'Delivered', count: counts.delivered, color: 'text-accent', bg: 'bg-accent/5', icon: CheckCircle2 },
          { label: 'Cancelled', count: counts.cancelled, color: 'text-red-600', bg: 'bg-red-50', icon: X },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} p-6 rounded-3xl border border-white/50 shadow-sm flex items-center gap-4`}>
            <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 w-fit rounded-2xl overflow-x-auto max-w-full">
        {[
          { id: 'pending', icon: Clock, activeColor: 'text-slate-600', badgeActive: 'bg-slate-100 text-slate-600', badgeInactive: 'bg-slate-200 text-slate-500' },
          { id: 'in-transit', icon: MapPin, activeColor: 'text-primary', badgeActive: 'bg-primary/10 text-primary', badgeInactive: 'bg-slate-200 text-slate-500' },
          { id: 'delivered', icon: CheckCircle2, activeColor: 'text-accent', badgeActive: 'bg-accent/10 text-accent', badgeInactive: 'bg-slate-200 text-slate-500' },
          { id: 'cancelled', icon: X, activeColor: 'text-red-600', badgeActive: 'bg-red-100 text-red-600', badgeInactive: 'bg-slate-200 text-slate-500' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Shipment['status'])}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
              activeTab === tab.id
                ? `bg-white ${tab.activeColor} shadow-sm`
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.id.charAt(0).toUpperCase() + tab.id.slice(1).replace('-', ' ')}
            <span className={cn(
              "px-2 py-0.5 rounded-full text-[10px]",
              activeTab === tab.id ? tab.badgeActive : tab.badgeInactive
            )}>
              {counts[tab.id as keyof typeof counts]}
            </span>
          </button>
        ))}
      </div>

      {/* Trips List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Trip ID, Container, Route..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Trip ID / Order</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Route</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Container / Product</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Vehicle / Driver</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-4">
                      <div className="h-4 bg-slate-100 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-500">No trips found.</p>
                  </td>
                </tr>
              ) : (
                filteredShipments.map((shipment) => (
                  <tr key={shipment.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary">{shipment.tripId}</span>
                          {shipment.status === 'in-transit' && !shipment.driverId && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[8px] font-black uppercase rounded-full">
                              Pending Info
                            </span>
                          )}
                        </div>
                        {shipment.orderId && (
                          <div className="flex items-center gap-1 mt-1">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Linked Order</span>
                            {!shipment.vehicleId && (
                              <span className="px-1.5 py-0.5 bg-orange-100 text-orange-600 text-[8px] font-black rounded uppercase">Unassigned</span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{shipment.origin}</span>
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                          <ArrowRight className="w-3 h-3" />
                          {shipment.destination}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(shipment.status)}`}>
                        {shipment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm text-slate-600 font-medium">{shipment.containerNumber || 'No Container'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {shipment.vehicleId ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900">{shipment.vehicleNumber}</span>
                          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                            {vehicles.find(v => v.id === shipment.vehicleId)?.vehicleType} • {shipment.driverName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {shipment.status === 'in-transit' && (
                          <button
                            onClick={async () => {
                              try {
                                await apiFetch(`/api/shipments/${shipment.id}`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({
                                    status: 'delivered',
                                    actualArrival: new Date().toISOString(),
                                  }),
                                });
                                if (shipment.vehicleId) {
                                  await apiFetch(`/api/vehicles/${shipment.vehicleId}`, {
                                    method: 'PATCH',
                                    body: JSON.stringify({ isAvailable: true }),
                                  });
                                }
                                setSelectedTripForExpense(shipment);
                                setExpenseItems([{ category: 'Fuel', amount: '', description: '' }]);
                                setIsExpenseModalOpen(true);
                              } catch (err) {
                                console.error('Error marking shipment as delivered:', err);
                                showToast(parseApiError(err), 'error');
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-[10px] font-black uppercase hover:bg-accent hover:text-white transition-all"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Mark Delivered
                          </button>
                        )}
                        {!shipment.vehicleId && shipment.status === 'pending' && (
                          <button
                            onClick={() => openModal(shipment)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-[10px] font-black uppercase hover:bg-accent hover:text-white transition-all"
                          >
                            <Truck className="w-3 h-3" />
                            Assign Trip
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/app/expenses?tripId=${shipment.id}`)}
                          title="Add Expense"
                          className="p-2 text-slate-400 hover:text-accent hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                        >
                          <IndianRupee className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const order = orders.find(o => o.id === shipment.orderId);
                            const vehicle = vehicles.find(v => v.id === shipment.vehicleId);
                            downloadLR(shipment, order, vehicle);
                          }}
                          title="Download LR"
                          className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openModal(shipment)}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ShipmentEditModal
        isOpen={isModalOpen}
        editingShipment={editingShipment}
        formData={formData}
        setFormData={setFormData}
        vehicles={vehicles}
        drivers={drivers}
        suggestedRoutes={suggestedRoutes}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onVehicleChange={handleVehicleChange}
        onCompanyChange={handleCompanyChange}
      />

      <TripExpenseModal
        isOpen={isExpenseModalOpen}
        selectedTrip={selectedTripForExpense}
        expenseItems={expenseItems}
        setExpenseItems={setExpenseItems}
        existingExpenses={expenses.filter(e => e.tripId === selectedTripForExpense?.id)}
        submitting={submitting}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setSelectedTripForExpense(null);
          setExpenseItems([{ category: 'Fuel', amount: '', description: '' }]);
        }}
        onSubmit={handleExpenseSubmit}
      />

      {/* Annexure Modal */}
      <AnimatePresence>
        {isAnnexureModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-primary text-white">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Download Annexure
                </h2>
                <button onClick={() => setIsAnnexureModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Start Date</label>
                    <input
                      type="date"
                      value={annexureDateRange.start}
                      onChange={(e) => setAnnexureDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">End Date</label>
                    <input
                      type="date"
                      value={annexureDateRange.end}
                      onChange={(e) => setAnnexureDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => {
                      const filtered = shipments.filter(s => {
                        const date = s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '';
                        return date >= annexureDateRange.start && date <= annexureDateRange.end;
                      });
                      downloadAnnexureReport(filtered, orders, 'excel');
                      setIsAnnexureModalOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    Excel
                  </button>
                  <button
                    onClick={() => {
                      const filtered = shipments.filter(s => {
                        const date = s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : '';
                        return date >= annexureDateRange.start && date <= annexureDateRange.end;
                      });
                      downloadAnnexureReport(filtered, orders, 'pdf');
                      setIsAnnexureModalOpen(false);
                    }}
                    className="flex items-center justify-center gap-2 bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                  >
                    <FileText className="w-5 h-5" />
                    PDF
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
