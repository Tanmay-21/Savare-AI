import React, { useState, useEffect } from 'react';
import { Shipment, Vehicle, Driver } from '../types';
import { apiFetch } from '../lib/api';
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

export default function Shipments() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
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
  const [loading, setLoading] = useState(true);
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
  const [expenseItems, setExpenseItems] = useState([{ category: 'Fuel' as any, amount: '', description: '' }]);

  const fetchData = async () => {
    try {
      const [shipmentList, vehicleList, driverList, expenseList, orderList] = await Promise.all([
        apiFetch('/api/shipments'),
        apiFetch('/api/vehicles'),
        apiFetch('/api/drivers'),
        apiFetch('/api/expenses'),
        apiFetch('/api/orders'),
      ]);
      setShipments(shipmentList);
      setVehicles(vehicleList);
      setDrivers(driverList);
      setExpenses(expenseList);
      setOrders(orderList);
    } catch (error) {
      console.error('Error fetching shipments data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

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
        status: prev.status === 'pending' ? 'in-transit' : prev.status // Auto change to in-transit if it was pending
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
    // Unique routes
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
      let updatedFormData = { 
        ...formData,
        updatedAt: now
      };
      
      // If status changed to delivered, trigger expense modal
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

      // Handle vehicle change
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
      closeModal();
    } catch (err) {
      console.error('Error updating shipment:', err);
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
    } catch (err) {
      console.error('Error submitting expense:', err);
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
            <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm`}>
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
        <button
          onClick={() => setActiveTab('pending')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'pending'
              ? "bg-white text-slate-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Clock className="w-4 h-4" />
          Pending
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px]",
            activeTab === 'pending' ? "bg-slate-100 text-slate-600" : "bg-slate-200 text-slate-500"
          )}>
            {counts.pending}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('in-transit')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'in-transit'
              ? "bg-white text-primary shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <MapPin className="w-4 h-4" />
          In Transit
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px]",
            activeTab === 'in-transit' ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
          )}>
            {counts['in-transit']}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('delivered')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'delivered'
              ? "bg-white text-accent shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          Delivered
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px]",
            activeTab === 'delivered' ? "bg-accent/10 text-accent" : "bg-slate-200 text-slate-500"
          )}>
            {counts.delivered}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('cancelled')}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
            activeTab === 'cancelled'
              ? "bg-white text-red-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          )}
        >
          <X className="w-4 h-4" />
          Cancelled
          <span className={cn(
            "px-2 py-0.5 rounded-full text-[10px]",
            activeTab === 'cancelled' ? "bg-red-100 text-red-600" : "bg-slate-200 text-slate-500"
          )}>
            {counts.cancelled}
          </span>
        </button>
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
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Edit Trip Details
                </h2>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[70vh]">
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
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    placeholder="Search or enter billing party..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                  />
                  {suggestedRoutes.length > 0 && (
                    <div className="mt-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Suggested Routes</p>
                      <div className="flex flex-wrap gap-2">
                        {suggestedRoutes.map((route, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setFormData({ ...formData, origin: route.origin, destination: route.destination })}
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
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles
                      .filter(v => v.isAvailable !== false || v.id === formData.vehicleId)
                      .map(v => (
                        <option key={v.id} value={v.id}>{v.plateNumber} ({v.vehicleType})</option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Driver</label>
                  <select
                    disabled={editingShipment?.isLocked}
                    value={formData.driverId}
                    onChange={(e) => {
                      const driver = drivers.find(d => d.id === e.target.value);
                      setFormData({ 
                        ...formData, 
                        driverId: e.target.value,
                        driverName: driver?.name || ''
                      });
                    }}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all disabled:opacity-50"
                  >
                    <option value="">Select Driver</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
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
                    onChange={(e) => setFormData({ ...formData, containerSize: e.target.value as any })}
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
                        "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                        formData.isLolo ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-200"
                      )}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      disabled={!!editingShipment?.orderId || editingShipment?.isLocked}
                      onClick={() => setFormData({ ...formData, isLolo: false, yardSelection: '' })}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold border transition-all",
                        !formData.isLolo ? "bg-primary text-white border-primary" : "bg-white text-slate-500 border-slate-200"
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
                    {[
                      { id: 'pending', icon: Clock, color: 'orange' },
                      { id: 'in-transit', icon: MapPin, color: 'blue' },
                      { id: 'delivered', icon: CheckCircle2, color: 'emerald' },
                      { id: 'cancelled', icon: AlertTriangle, color: 'red' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, status: s.id as any })}
                        className={cn(
                          "flex flex-col items-center gap-2 py-4 px-2 rounded-2xl text-[10px] font-bold border transition-all capitalize",
                          formData.status === s.id 
                            ? `bg-${s.color}-50 text-${s.color}-600 border-${s.color}-200 ring-2 ring-${s.color}-500/20` 
                            : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
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
                      editingShipment ? 'Update Trip' : 'Create Trip'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Expense Modal */}
      <AnimatePresence>
        {isExpenseModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpenseModalOpen(false)}
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
                  <h2 className="text-2xl font-bold text-emerald-900 tracking-tight">Add Trip Expenses</h2>
                  <p className="text-xs text-emerald-700 mt-1">Trip #{selectedTripForExpense?.tripId} • {selectedTripForExpense?.vehicleNumber}</p>
                </div>
                <button onClick={() => setIsExpenseModalOpen(false)} className="p-2 text-emerald-400 hover:text-emerald-900 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleExpenseSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Existing Expenses Summary */}
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Existing Expenses for this Trip</span>
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
                          .filter(e => e.tripId === selectedTripForExpense?.id)
                          .map((e, i) => (
                            <tr key={i} className="text-amber-800">
                              <td className="py-1 font-medium">{e.category}</td>
                              <td className="py-1">₹{e.amount}</td>
                              <td className="py-1">{new Date(e.date).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        {expenses.filter(e => e.tripId === selectedTripForExpense?.id).length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-2 text-center text-amber-600/40 italic">No expenses recorded yet</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-4">
                  {expenseItems.map((item, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 relative">
                      {expenseItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setExpenseItems(expenseItems.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Type</label>
                          <select
                            required
                            value={item.category}
                            onChange={(e) => {
                              const newItems = [...expenseItems];
                              newItems[index].category = e.target.value as any;
                              setExpenseItems(newItems);
                            }}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                          >
                            <option value="Fuel">Fuel</option>
                            <option value="Toll">Toll</option>
                            <option value="Maintenance">Maintenance</option>
                            <option value="Driver Allowance">Driver Allowance</option>
                            <option value="Loading/Unloading">Loading/Unloading</option>
                            <option value="Permit/Tax">Permit/Tax</option>
                            <option value="Weighment Charges">Weighment Charges</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</label>
                          <div className="relative">
                            <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                              required
                              type="number"
                              value={item.amount}
                              onChange={(e) => {
                                const newItems = [...expenseItems];
                                newItems[index].amount = e.target.value;
                                setExpenseItems(newItems);
                              }}
                              placeholder="0.00"
                              className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...expenseItems];
                            newItems[index].description = e.target.value;
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
                  onClick={() => setExpenseItems([...expenseItems, { category: 'Other' as any, amount: '', description: '' }])}
                  className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Another Expense
                </button>

                <div className="pt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsExpenseModalOpen(false)}
                    className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Skip
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-4 px-6 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm Completion'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
