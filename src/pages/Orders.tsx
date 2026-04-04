import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Order, Shipment, Expense } from '../types';
import { apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { parseApiError } from '../lib/parseApiError';
import { useData } from '../contexts/DataContext';
import { FieldError, fieldErrorClass } from '../components/ui/FieldError';
import { 
  FileText, 
  Plus, 
  Search, 
  Calendar, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Filter,
  Package,
  CheckCircle2,
  Clock,
  Truck,
  X,
  Loader2,
  MoreVertical,
  Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import * as XLSX from 'xlsx';

export default function Orders() {
  const { showToast } = useToast();
  const autoCompletedRef = useRef<Set<string>>(new Set());
  const { orders, shipments, expenses, loading, refetch: fetchData } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dateFilter, setDateFilter] = useState<'7days' | 'custom'>('7days');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());

  const [activeOrderTab, setActiveOrderTab] = useState<'active' | 'completed'>('active');
  const [formData, setFormData] = useState({
    billingPartyName: '',
    consigneeName: '',
    isBillingSameAsConsignee: true,
    origin: '',
    destination: '',
    containerSize: '20 ft' as '20 ft' | '40 ft',
    containerCount: 1,
    movementType: 'Import' as 'Import' | 'Export' | 'Rail',
    isLolo: false,
    yardSelection: '',
    remarks: '',
  });

  useEffect(() => {
    // Auto-complete orders where all shipments are delivered.
    // Track which orders have already been sent for auto-completion this session
    // to avoid firing PATCH on every poll cycle.
    const newlyComplete = orders.filter(order => {
      if (order.status === 'completed') return false;
      if (autoCompletedRef.current.has(order.id)) return false;
      const orderShipments = shipments.filter(s => s.orderId === order.id);
      if (orderShipments.length === 0) return false;
      return orderShipments.every(s => s.status === 'delivered');
    });

    if (newlyComplete.length === 0) return;

    newlyComplete.forEach(o => autoCompletedRef.current.add(o.id));

    Promise.all(
      newlyComplete.map((order) =>
        apiFetch(`/api/orders/${order.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'completed' }),
        }).then(() => fetchData()).catch((error) => {
          autoCompletedRef.current.delete(order.id);
          showToast(parseApiError(error), 'error');
        })
      )
    );
  }, [orders, shipments]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.billingPartyName.trim()) errors.billingPartyName = 'Billing party name is required.';
    if (!formData.origin.trim()) errors.origin = 'Origin is required.';
    if (!formData.destination.trim()) errors.destination = 'Destination is required.';
    if (formData.origin.trim() && formData.destination.trim() &&
        formData.origin.trim().toLowerCase() === formData.destination.trim().toLowerCase()) {
      errors.destination = 'Destination must be different from origin.';
    }
    if (!formData.containerCount || formData.containerCount < 1) errors.containerCount = 'At least 1 container required.';
    if (formData.containerCount > 50) errors.containerCount = 'Maximum 50 containers per order.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      // Create order (API atomically assigns order number and creates shipments)
      const order = await apiFetch('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          billingPartyName: formData.billingPartyName,
          consigneeName: formData.isBillingSameAsConsignee ? formData.billingPartyName : formData.consigneeName,
          isBillingSameAsConsignee: formData.isBillingSameAsConsignee,
          origin: formData.origin,
          destination: formData.destination,
          containerSize: formData.containerSize,
          movementType: formData.movementType,
          isLolo: formData.isLolo,
          yardSelection: formData.yardSelection,
          containerCount: formData.containerCount,
          remarks: formData.remarks,
        }),
      });

      // Create all shipments in parallel
      await Promise.all(
        Array.from({ length: formData.containerCount }, () =>
          apiFetch('/api/shipments', {
            method: 'POST',
            body: JSON.stringify({
              orderId: order.id,
              containerSize: formData.containerSize,
              origin: formData.origin,
              destination: formData.destination,
              billingPartyName: formData.billingPartyName,
              consigneeName: order.consigneeName,
              movementType: formData.movementType,
              isLolo: formData.isLolo,
              yardSelection: formData.yardSelection,
              remarks: formData.remarks,
            }),
          })
        )
      );

      await fetchData();
      setIsModalOpen(false);
      setFormErrors({});
      setFormData({
        billingPartyName: '',
        consigneeName: '',
        isBillingSameAsConsignee: true,
        origin: '',
        destination: '',
        containerSize: '20 ft',
        containerCount: 1,
        movementType: 'Import',
        isLolo: false,
        yardSelection: '',
        remarks: '',
      });
      showToast('Order created successfully.', 'success');
    } catch (error) {
      console.error('Error creating order:', error);
      showToast(parseApiError(error), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      next.has(orderId) ? next.delete(orderId) : next.add(orderId);
      return next;
    });
  };

  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      next.has(orderId) ? next.delete(orderId) : next.add(orderId);
      return next;
    });
  };

  const filterOrders = (orders: Order[]) => {
    return orders.filter(order => {
      const billingParty = order.billingPartyName || '';
      const orderNum = order.orderNumber || '';
      const matchesSearch = billingParty.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            orderNum.toLowerCase().includes(searchQuery.toLowerCase());
      
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      
      const matchesTab = activeOrderTab === 'active' ? order.status !== 'completed' : order.status === 'completed';

      if (dateFilter === '7days') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return matchesSearch && matchesTab && orderDate >= sevenDaysAgo;
      } else {
        if (!customRange.start || !customRange.end) return matchesSearch && matchesTab;
        const start = new Date(customRange.start);
        const end = new Date(customRange.end);
        end.setHours(23, 59, 59, 999);
        return matchesSearch && matchesTab && orderDate >= start && orderDate <= end;
      }
    });
  };

  const generateAnnexure = (orderIds: string[]) => {
    const dataToExport: any[] = [];
    
    orderIds.forEach(orderId => {
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      const orderShipments = shipments.filter(s => s.orderId === orderId);
      
      orderShipments.forEach(shipment => {
        const shipmentExpenses = expenses.filter(e => e.tripId === shipment.tripId);
        const totalExpense = shipmentExpenses.reduce((sum, e) => sum + e.amount, 0);

        dataToExport.push({
          'Order Number': order.orderNumber,
          'Billing Party': order.billingPartyName || (order as any).companyName || 'N/A',
          'Consignee': order.consigneeName || 'N/A',
          'Size': order.containerSize,
          'Trip ID': shipment.tripId,
          'Container No': shipment.containerNumber || 'N/A',
          'Origin': shipment.origin,
          'Destination': shipment.destination,
          'Vehicle': shipment.vehicleNumber || 'N/A',
          'Driver': shipment.driverName || 'N/A',
          'Status': shipment.status,
          'Expenses (₹)': totalExpense,
          'Date': new Date(shipment.createdAt || order.createdAt).toLocaleDateString()
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Annexure');
    XLSX.writeFile(wb, `Annexure_${new Date().getTime()}.xlsx`);
  };

  const filteredOrders = filterOrders(orders);

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Order Management</h1>
          <p className="text-slate-500 mt-2 text-lg">Create and track bulk orders and container lifecycles.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedOrders.size > 0 && (
            <button
              onClick={() => generateAnnexure(Array.from(selectedOrders))}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
            >
              <Download className="w-5 h-5" />
              Generate Clubbed Annexure ({selectedOrders.size})
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl text-sm font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Create New Order
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 p-1 bg-slate-100 w-fit rounded-2xl">
          <button
            onClick={() => setActiveOrderTab('active')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all",
              activeOrderTab === 'active' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Active Orders
          </button>
          <button
            onClick={() => setActiveOrderTab('completed')}
            className={cn(
              "px-6 py-2 rounded-xl text-sm font-bold transition-all",
              activeOrderTab === 'completed' ? "bg-white text-accent shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Completed Orders
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by Company or Order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl border border-slate-200">
          <button
            onClick={() => setDateFilter('7days')}
            className={cn(
              "flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all",
              dateFilter === '7days' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setDateFilter('custom')}
            className={cn(
              "flex-1 py-2 px-4 rounded-xl text-sm font-bold transition-all",
              dateFilter === 'custom' ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Custom Range
          </button>
        </div>

        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <input 
              type="date"
              value={customRange.start}
              onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-primary"
            />
            <span className="text-slate-400">to</span>
            <input 
              type="date"
              value={customRange.end}
              onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-primary"
            />
          </div>
        )}
      </div>
    </div>

      {/* Order Book */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-100">
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading Order Book...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] border border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
              <FileText className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Orders Found</h3>
            <p className="text-slate-500">Try adjusting your filters or create a new order.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const orderShipments = shipments.filter(s => s.orderId === order.id);
            const completedCount = orderShipments.filter(s => s.status === 'delivered').length;
            const progress = (completedCount / order.containerCount) * 100;
            const isExpanded = expandedOrders.has(order.id!);
            const isSelected = selectedOrders.has(order.id!);

            return (
              <div key={order.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOrderSelection(order.id!)}
                        className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center">
                        <FileText className="w-7 h-7 text-slate-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-black text-slate-900">{order.orderNumber}</h3>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                            order.status === 'completed' ? "bg-accent/10 text-accent" :
                            order.status === 'in-progress' ? "bg-primary/10 text-primary" :
                            "bg-slate-100 text-slate-600"
                          )}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-slate-500 font-bold text-sm mt-1">{order.billingPartyName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Route</p>
                        <p className="text-sm font-bold text-slate-700">{order.origin} → {order.destination}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Progress</p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-accent transition-all duration-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-black text-slate-700">{completedCount}/{order.containerCount}</span>
                        </div>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Created</p>
                        <p className="text-sm font-bold text-slate-700">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => generateAnnexure([order.id!])}
                        className="p-3 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-2xl transition-all"
                        title="Download Annexure"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => toggleOrderExpansion(order.id!)}
                        className="p-3 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-2xl transition-all"
                      >
                        {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="border-t border-slate-50 bg-slate-50/50"
                    >
                      <div className="p-6 md:p-8 space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-4">Container Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {orderShipments.map((shipment) => (
                            <div key={shipment.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center",
                                  shipment.status === 'delivered' ? "bg-accent/10 text-accent" :
                                  shipment.status === 'in-transit' ? "bg-primary/10 text-primary" :
                                  "bg-slate-100 text-slate-400"
                                )}>
                                  <Package className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-slate-900">{shipment.tripId}</p>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase">{shipment.status}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-slate-700">{shipment.containerNumber || 'Unassigned'}</p>
                                <p className="text-[10px] text-slate-400">{shipment.vehicleNumber || 'No Vehicle'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>

      {/* Create Order Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">Create New Order</h2>
                      <p className="text-slate-500">Input bulk order details to start the lifecycle.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Billing Party Name</label>
                      <input
                        type="text"
                        value={formData.billingPartyName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData({
                            ...formData,
                            billingPartyName: val,
                            consigneeName: formData.isBillingSameAsConsignee ? val : formData.consigneeName
                          });
                          if (formErrors.billingPartyName) setFormErrors({ ...formErrors, billingPartyName: '' });
                        }}
                        placeholder="Enter billing party name"
                        className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${formErrors.billingPartyName ? fieldErrorClass : 'border-slate-200'}`}
                      />
                      <FieldError message={formErrors.billingPartyName} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Consignee Details</label>
                      <div className="flex items-center gap-2 mb-2">
                        <input 
                          type="checkbox"
                          id="sameAsBilling"
                          checked={formData.isBillingSameAsConsignee}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setFormData({ 
                              ...formData, 
                              isBillingSameAsConsignee: checked,
                              consigneeName: checked ? formData.billingPartyName : formData.consigneeName
                            });
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="sameAsBilling" className="text-xs font-bold text-slate-500 cursor-pointer">
                          Billing Name is same as Consignee Name
                        </label>
                      </div>
                      {!formData.isBillingSameAsConsignee && (
                        <input 
                          required
                          type="text"
                          value={formData.consigneeName}
                          onChange={(e) => setFormData({ ...formData, consigneeName: e.target.value })}
                          placeholder="Enter consignee name"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Container Size</label>
                      <select
                        required
                        value={formData.containerSize}
                        onChange={(e) => setFormData({ ...formData, containerSize: e.target.value as any })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                      >
                        <option value="20 ft">20 ft</option>
                        <option value="40 ft">40 ft</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Origin</label>
                      <input
                        type="text"
                        value={formData.origin}
                        onChange={(e) => {
                          setFormData({ ...formData, origin: e.target.value });
                          if (formErrors.origin) setFormErrors({ ...formErrors, origin: '' });
                        }}
                        placeholder="Pickup location"
                        className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${formErrors.origin ? fieldErrorClass : 'border-slate-200'}`}
                      />
                      <FieldError message={formErrors.origin} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Destination</label>
                      <input
                        type="text"
                        value={formData.destination}
                        onChange={(e) => {
                          setFormData({ ...formData, destination: e.target.value });
                          if (formErrors.destination) setFormErrors({ ...formErrors, destination: '' });
                        }}
                        placeholder="Drop location"
                        className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${formErrors.destination ? fieldErrorClass : 'border-slate-200'}`}
                      />
                      <FieldError message={formErrors.destination} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Container Count</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={isNaN(formData.containerCount) ? '' : formData.containerCount}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setFormData({ ...formData, containerCount: isNaN(val) ? 0 : val });
                          if (formErrors.containerCount) setFormErrors({ ...formErrors, containerCount: '' });
                        }}
                        className={`w-full px-4 py-3 bg-slate-50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all ${formErrors.containerCount ? fieldErrorClass : 'border-slate-200'}`}
                      />
                      <FieldError message={formErrors.containerCount} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Movement Type</label>
                      <select
                        required
                        value={formData.movementType}
                        onChange={(e) => setFormData({ ...formData, movementType: e.target.value as any })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                      >
                        <option value="Import">Import</option>
                        <option value="Export">Export</option>
                        <option value="Rail">Rail</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">LOLO</label>
                      <div className="flex items-center gap-4 py-1">
                        <button
                          type="button"
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
                        <label className="text-sm font-bold text-slate-700 ml-1">Select Yard</label>
                        <input 
                          required
                          type="text"
                          value={formData.yardSelection}
                          onChange={(e) => setFormData({ ...formData, yardSelection: e.target.value })}
                          placeholder="Enter yard name"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                        />
                      </div>
                    )}
                    <div className="col-span-full space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Remarks (Optional)</label>
                      <textarea 
                        value={formData.remarks}
                        onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        placeholder="Add any additional notes..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all min-h-[100px]"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Creating Order...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          Confirm & Create Order
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
