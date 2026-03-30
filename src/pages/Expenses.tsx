import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Expense, Shipment, Driver, Vehicle } from '../types';
import { apiFetch } from '../lib/api';
import { downloadExpenseReport, downloadPayoutReport } from '../utils/reportGenerator';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X,
  IndianRupee,
  Calendar,
  Tag,
  FileText,
  CreditCard,
  Wallet,
  CheckCircle2,
  Clock,
  MessageSquare,
  Loader2,
  Truck,
  Download,
  Printer,
  ChevronRight,
  Activity,
  MapPin,
  Users,
  Package,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import * as XLSX from 'xlsx';

const CATEGORIES = [
  'Fuel',
  'Toll',
  'Maintenance',
  'Driver Allowance',
  'Loading/Unloading',
  'Permit/Tax',
  'Weighment Charges',
  'Other'
];

export default function Expenses() {
  const [searchParams] = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportDateRange, setReportDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'paid'>('pending');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [markingAsPaid, setMarkingAsPaid] = useState<Expense | null>(null);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [markAsPaidRemark, setMarkAsPaidRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPayAllConfirm, setShowPayAllConfirm] = useState(false);
  const [selectedVehicleForPayment, setSelectedVehicleForPayment] = useState<string | null>(null);
  const [expenseItems, setExpenseItems] = useState([{ category: 'Fuel', amount: 0, description: '' }]);

  // Form state
  const [formData, setFormData] = useState<Omit<Expense, 'id'>>({
    tripId: '',
    vehicleId: '',
    vehicleNumber: '',
    category: 'Fuel',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'cash',
    status: 'pending',
    paymentRemark: '',
    description: ''
  });

  useEffect(() => {
    const tripIdParam = searchParams.get('tripId');
    if (tripIdParam) {
      setFormData(prev => ({ ...prev, tripId: tripIdParam }));
      setIsModalOpen(true);
    }
  }, [searchParams]);

  const fetchData = async () => {
    try {
      const [expenseList, tripList, driverList, vehicleList] = await Promise.all([
        apiFetch('/api/expenses'),
        apiFetch('/api/shipments'),
        apiFetch('/api/drivers'),
        apiFetch('/api/vehicles'),
      ]);
      setExpenses(expenseList);
      setTrips(tripList);
      setDrivers(driverList);
      setVehicles(vehicleList);
    } catch (error) {
      console.error('Error fetching expenses data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingExpense) {
        await apiFetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData),
        });
      } else {
        // Save multiple expense items
        const creates = expenseItems
          .filter(item => item.amount > 0)
          .map(item => apiFetch('/api/expenses', {
            method: 'POST',
            body: JSON.stringify({ ...formData, category: item.category, amount: item.amount, description: item.description }),
          }));
        await Promise.all(creates);

        // Auto-transition trip status to delivered
        if (formData.tripId) {
          const trip = trips.find(t => t.id === formData.tripId);
          if (trip && trip.status === 'in-transit') {
            await apiFetch(`/api/shipments/${trip.id}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: 'delivered', actualArrival: new Date().toISOString() }),
            });
          }
        }
      }
      await fetchData();
      closeModal();
    } catch (err) {
      console.error('Error saving expense:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/expenses/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      await fetchData();
    } catch (err) {
      console.error('Error deleting expense:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        tripId: expense.tripId || '',
        vehicleId: expense.vehicleId || '',
        vehicleNumber: expense.vehicleNumber || '',
        category: expense.category,
        amount: expense.amount,
        date: expense.date,
        paymentMethod: expense.paymentMethod || 'cash',
        status: expense.status || 'pending',
        paymentRemark: expense.paymentRemark || '',
        description: expense.description || ''
      });
      setExpenseItems([{ category: expense.category, amount: expense.amount, description: expense.description || '' }]);
    } else {
      setEditingExpense(null);
      setFormData({
        tripId: '',
        vehicleId: '',
        vehicleNumber: '',
        category: 'Fuel',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: 'cash',
        status: 'pending',
        paymentRemark: '',
        description: ''
      });
      setExpenseItems([{ category: 'Fuel', amount: 0, description: '' }]);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
    setFormData({
      tripId: '',
      vehicleId: '',
      vehicleNumber: '',
      category: 'Fuel',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: 'cash',
      status: 'pending',
      paymentRemark: '',
      description: ''
    });
    setExpenseItems([{ category: 'Fuel', amount: 0, description: '' }]);
  };

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = 
      (e.category?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (e.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (e.paymentRemark?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesTab = e.status === activeTab;
    const matchesVehicle = selectedVehicle === 'all' || e.vehicleId === selectedVehicle || (e as any).vehicleNumber === selectedVehicle;
    
    return matchesSearch && matchesTab && matchesVehicle;
  });

  const vehicleGroups = Array.from(new Set(expenses.map(e => (e as any).vehicleNumber || 'Unassigned'))).filter(Boolean);

  const getDriverForVehicle = (vNumber: string) => {
    const vehicle = vehicles.find(v => v.plateNumber === vNumber);
    if (!vehicle) return null;
    return drivers.find(d => d.id === vehicle.currentDriverId);
  };

  const handlePayAll = async () => {
    if (selectedVehicle === 'all') return;
    setShowPaymentSheet(true);
  };

  const confirmBulkPayment = async () => {
    setSubmitting(true);
    try {
      const pendingForVehicle = filteredExpenses.filter(e => e.status === 'pending');
      await Promise.all(pendingForVehicle.map(e =>
        apiFetch(`/api/expenses/${e.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'paid', paymentRemark: `Bulk payment on ${new Date().toLocaleDateString()}` }),
        })
      ));
      await fetchData();
      setShowPaymentSheet(false);
    } catch (err) {
      console.error('Error with bulk payment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    console.log(`Exporting payment sheet as ${format.toUpperCase()}...`);
    // In a real app, we would use libraries like jspdf, xlsx, or generate a CSV blob.
  };

  const [expandedVehicles, setExpandedVehicles] = useState<Record<string, boolean>>({});

  const toggleVehicle = (vNumber: string) => {
    setExpandedVehicles(prev => ({ ...prev, [vNumber]: !prev[vNumber] }));
  };

  // Grouping logic
  const groupedByVehicle = expenses
    .filter(e => e.status === activeTab)
    .filter(e => {
      const matchesSearch = e.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.paymentRemark?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSearch;
    })
    .reduce((acc, expense) => {
      const vNumber = (expense as any).vehicleNumber || 'Unassigned';
      if (!acc[vNumber]) {
        acc[vNumber] = {
          vehicleNumber: vNumber,
          vehicleId: expense.vehicleId,
          total: 0,
          trips: {}
        };
      }
      acc[vNumber].total += expense.amount;
      
      const tripId = expense.tripId || 'General';
      if (!acc[vNumber].trips[tripId]) {
        const tripDetails = trips.find(t => t.id === tripId || t.tripId === tripId);
        acc[vNumber].trips[tripId] = {
          tripId,
          tripDetails,
          expenses: []
        };
      }
      acc[vNumber].trips[tripId].expenses.push(expense);
      
      return acc;
    }, {} as Record<string, any>);

  const visibleVehicles = Object.values(groupedByVehicle);

  const handlePayAllAll = async () => {
    if (activeTab !== 'pending') return;
    const pendingExpenses = expenses.filter(e => e.status === 'pending');
    if (pendingExpenses.length === 0) return;

    // Generate Payout Report
    await downloadPayoutReport(pendingExpenses, drivers);

    setShowPayAllConfirm(true);
  };

  const confirmPayAllAll = async () => {
    setSubmitting(true);
    try {
      const pendingExpenses = expenses.filter(e => e.status === 'pending');
      await Promise.all(pendingExpenses.map(e =>
        apiFetch(`/api/expenses/${e.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'paid', paymentRemark: `Bulk payment on ${new Date().toLocaleDateString()}` }),
        })
      ));
      await fetchData();
      setShowPayAllConfirm(false);
    } catch (err) {
      console.error('Error with pay-all:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayVehicle = async (vNumber: string) => {
    const vehicleExpenses = expenses.filter(e => e.status === 'pending' && (e as any).vehicleNumber === vNumber);
    if (vehicleExpenses.length === 0) return;

    // Generate Payout Report for this vehicle
    await downloadPayoutReport(vehicleExpenses, drivers);

    setSelectedVehicleForPayment(vNumber);
  };

  const confirmVehiclePayment = async () => {
    if (!selectedVehicleForPayment) return;
    setSubmitting(true);
    try {
      const vehicleExpenses = expenses.filter(e => e.status === 'pending' && (e as any).vehicleNumber === selectedVehicleForPayment);
      await Promise.all(vehicleExpenses.map(e =>
        apiFetch(`/api/expenses/${e.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: 'paid', paymentRemark: `Bulk vehicle payment on ${new Date().toLocaleDateString()}` }),
        })
      ));
      await fetchData();
      setSelectedVehicleForPayment(null);
    } catch (err) {
      console.error('Error with vehicle payment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pendingCount = expenses.filter(e => e.status === 'pending').length;
  const paidCount = expenses.filter(e => e.status === 'paid').length;

  const handleMarkAsPaid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markingAsPaid) return;
    setSubmitting(true);
    try {
      await apiFetch(`/api/expenses/${markingAsPaid.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'paid',
          paymentMethod: (markingAsPaid as any).selectedPaymentMethod || markingAsPaid.paymentMethod || 'cash',
          paymentRemark: markAsPaidRemark || 'Marked as paid from list',
        }),
      });

      // Auto-transition trip status to delivered when an expense is paid
      if (markingAsPaid.tripId) {
        const trip = trips.find(t => t.id === markingAsPaid.tripId);
        if (trip && trip.status === 'in-transit') {
          await apiFetch(`/api/shipments/${trip.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'delivered', actualArrival: new Date().toISOString() }),
          });
        }
      }

      await fetchData();
      setMarkingAsPaid(null);
      setMarkAsPaidRemark('');
    } catch (err) {
      console.error('Error marking as paid:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Expenses</h1>
          <p className="text-slate-500 mt-1">Track trip-wise and operational costs.</p>
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
                const filtered = expenses.filter(e => {
                  const date = e.date;
                  return date >= reportDateRange.start && date <= reportDateRange.end;
                });
                downloadExpenseReport(filtered, trips, 'excel');
              }}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all text-sm font-bold"
              title="Download Excel Report"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
              Excel
            </button>
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <Plus className="w-5 h-5" />
            Add Expense
          </button>
        </div>
      </header>

      {/* Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center">
            <IndianRupee className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Amount</p>
            <p className="text-2xl font-black text-slate-900">₹{totalExpenses.toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
            <Clock className="w-6 h-6 text-slate-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Payment</p>
            <p className="text-2xl font-black text-slate-500">{pendingCount}</p>
          </div>
        </div>
        <div className="bg-accent/5 p-6 rounded-3xl border border-accent/10 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-accent" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Paid Expenses</p>
            <p className="text-2xl font-black text-accent">{paidCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 w-fit rounded-2xl">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'pending'
              ? 'bg-white text-primary shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'pending' ? 'bg-primary/10 text-primary' : 'bg-slate-200 text-slate-500'
          }`}>
            {pendingCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('paid')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'paid'
              ? 'bg-white text-accent shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Paid
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${
            activeTab === 'paid' ? 'bg-accent/10 text-accent' : 'bg-slate-200 text-slate-500'
          }`}>
            {paidCount}
          </span>
        </button>
      </div>

      {/* Expenses List */}
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by category or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
          </div>
        ) : visibleVehicles.length === 0 ? (
          <div className="bg-white p-20 rounded-3xl border border-slate-100 shadow-sm text-center">
            <IndianRupee className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500">No expenses recorded for this view.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleVehicles.map((vehicle: any) => (
              <div key={vehicle.vehicleNumber} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <button 
                  onClick={() => toggleVehicle(vehicle.vehicleNumber)}
                  className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                      <Truck className="w-6 h-6 text-slate-600" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold text-slate-900">{vehicle.vehicleNumber}</h3>
                      <p className="text-xs text-slate-500">
                        {Object.keys(vehicle.trips).length} Trips • {Object.values(vehicle.trips).reduce((sum: number, t: any) => sum + t.expenses.length, 0)} Expenses
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {activeTab === 'pending' && vehicle.total > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePayVehicle(vehicle.vehicleNumber);
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
                    <ChevronRight className={cn("w-5 h-5 text-slate-400 transition-transform", expandedVehicles[vehicle.vehicleNumber] && "rotate-90")} />
                  </div>
                </button>

                <AnimatePresence>
                  {expandedVehicles[vehicle.vehicleNumber] && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-slate-50"
                    >
                      <div className="p-6 space-y-8">
                        {Object.values(vehicle.trips).map((trip: any) => (
                          <div key={trip.tripId} className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div className="w-1 h-4 bg-primary rounded-full" />
                                  <h4 className="font-bold text-slate-900">
                                    {trip.tripId === 'General' ? 'General Expenses' : `Trip #${trip.tripDetails?.tripId || trip.tripId.slice(-6).toUpperCase()}`}
                                  </h4>
                                  {trip.tripDetails && (
                                    <span className={cn(
                                      "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                      trip.tripDetails.status === 'delivered' ? "bg-accent/10 text-accent" :
                                      trip.tripDetails.status === 'in-transit' ? "bg-primary/10 text-primary" :
                                      "bg-slate-100 text-slate-500"
                                    )}>
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
                                  ₹{trip.expenses.reduce((sum: number, e: any) => sum + e.amount, 0).toLocaleString('en-IN')}
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
                                  {trip.expenses.map((expense: any) => (
                                    <tr key={expense.id} className="group">
                                      <td className="px-4 py-4 text-sm text-slate-600">
                                        {new Date(expense.date).toLocaleDateString()}
                                      </td>
                                      <td className="px-4 py-4">
                                        <div className="flex flex-col">
                                          <span className="text-sm font-bold text-slate-900">{expense.category}</span>
                                          {expense.description && (
                                            <span className="text-xs text-slate-400 truncate max-w-[150px]">{expense.description}</span>
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
                                          <span className="text-xs text-slate-600 capitalize">{expense.paymentMethod}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-4 text-sm font-bold text-slate-900">
                                        ₹{expense.amount.toLocaleString('en-IN')}
                                      </td>
                                      <td className="px-4 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                          {activeTab === 'pending' && (
                                            <button 
                                              onClick={() => {
                                                setMarkingAsPaid({ ...expense, selectedPaymentMethod: 'cash' } as any);
                                                setMarkAsPaidRemark('Paid in Cash');
                                              }}
                                              className="p-1.5 text-accent bg-accent/5 hover:bg-accent/10 rounded-lg transition-all"
                                            >
                                              <CheckCircle2 className="w-4 h-4" />
                                            </button>
                                          )}
                                          <button 
                                            onClick={() => openModal(expense)}
                                            className="p-1.5 text-slate-400 hover:text-primary hover:bg-slate-50 rounded-lg transition-all"
                                          >
                                            <Edit2 className="w-4 h-4" />
                                          </button>
                                          <button 
                                            onClick={() => setDeleteId(expense.id!)}
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
            ))}
          </div>
        )}

        {activeTab === 'pending' && visibleVehicles.length > 0 && (
          <div className="pt-8 flex justify-center">
            <button
              onClick={handlePayAllAll}
              disabled={submitting}
              className="flex items-center gap-3 bg-accent text-white px-12 py-4 rounded-2xl font-black text-lg hover:bg-accent/90 transition-all shadow-xl shadow-accent/10 disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <IndianRupee className="w-6 h-6" />
                  PAY ALL PENDING EXPENSES
                </>
              )}
            </button>
          </div>
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
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  {editingExpense ? 'Edit Expense' : 'Add Expense'}
                </h2>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
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
                        const trip = trips.find(t => t.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          tripId: e.target.value,
                          vehicleId: trip?.vehicleId || '',
                          vehicleNumber: trip?.vehicleNumber || ''
                        });
                      }}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                    >
                      <option value="" disabled>Select a Trip</option>
                      {trips.map(trip => (
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
                              .filter(e => e.tripId === formData.tripId)
                              .map((e, i) => (
                                <tr key={i} className="text-amber-800">
                                  <td className="py-1 font-medium">{e.category}</td>
                                  <td className="py-1">₹{e.amount}</td>
                                  <td className="py-1">{new Date(e.date).toLocaleDateString()}</td>
                                </tr>
                              ))}
                            {expenses.filter(e => e.tripId === formData.tripId).length === 0 && (
                              <tr>
                                <td colSpan={3} className="py-2 text-center text-amber-600/40 italic">No expenses recorded yet</td>
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
                        onClick={() => setExpenseItems([...expenseItems, { category: 'Fuel', amount: 0, description: '' }])}
                        className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add Another Expense
                      </button>
                    )}
                  </div>
                  
                  {expenseItems.map((item, index) => (
                    <div key={index} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4 relative">
                      {expenseItems.length > 1 && !editingExpense && (
                        <button
                          type="button"
                          onClick={() => setExpenseItems(expenseItems.filter((_, i) => i !== index))}
                          className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Category</label>
                          <select
                            required
                            value={item.category}
                            onChange={(e) => {
                              const newItems = [...expenseItems];
                              newItems[index].category = e.target.value as any;
                              setExpenseItems(newItems);
                              if (editingExpense) setFormData({ ...formData, category: e.target.value as any });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Amount (₹)</label>
                          <input
                            required
                            type="number"
                            value={isNaN(item.amount) ? '' : item.amount}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              const newAmount = isNaN(val) ? 0 : val;
                              const newItems = [...expenseItems];
                              newItems[index].amount = newAmount;
                              setExpenseItems(newItems);
                              if (editingExpense) setFormData({ ...formData, amount: newAmount });
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Description</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => {
                            const newItems = [...expenseItems];
                            newItems[index].description = e.target.value;
                            setExpenseItems(newItems);
                            if (editingExpense) setFormData({ ...formData, description: e.target.value });
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
                      editingExpense ? 'Update Expense' : 'Save Expense'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Pay All Confirmation Modal */}
      <AnimatePresence>
        {showPayAllConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPayAllConfirm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-accent/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <IndianRupee className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Pay All Pending?</h3>
              <p className="text-slate-500 mb-8 text-sm">Are you sure you want to mark all pending expenses across all vehicles as paid? This will process {expenses.filter(e => e.status === 'pending').length} records.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPayAllConfirm(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPayAllAll}
                  disabled={submitting}
                  className="flex-1 py-3 px-4 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/10 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Confirm All'
                  )}
                </button>
              </div>
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
              <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Expense?</h3>
              <p className="text-slate-500 mb-8 text-sm">This action cannot be undone. Are you sure you want to remove this record?</p>
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

      {/* Mark as Paid Modal */}
      <AnimatePresence>
        {markingAsPaid && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMarkingAsPaid(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900">Mark as Paid</h3>
                <button onClick={() => setMarkingAsPaid(null)} className="p-2 text-slate-400 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleMarkAsPaid} className="p-6 space-y-4">
                <div className="p-4 bg-accent/5 rounded-2xl border border-accent/10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold text-accent uppercase tracking-wider">Amount to Pay</span>
                    <span className="text-lg font-bold text-accent">₹{markingAsPaid.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-xs text-accent/70">{markingAsPaid.category} expense for trip #{markingAsPaid.tripId?.slice(-6).toUpperCase()}</p>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700">Payment Method</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'cash', icon: Wallet, color: 'emerald', label: 'Cash' },
                      { id: 'online', icon: CreditCard, color: 'blue', label: 'Online' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMarkAsPaidRemark(m.id === 'cash' ? 'Paid in Cash' : 'Paid Online');
                          setMarkingAsPaid({ ...markingAsPaid, selectedPaymentMethod: m.id } as any);
                        }}
                        className={cn(
                          "flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border transition-all font-bold text-sm",
                          (markingAsPaid as any).selectedPaymentMethod === m.id
                            ? `bg-${m.color}-50 border-${m.color}-200 text-${m.color}-700 ring-2 ring-${m.color}-500/10`
                            : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                        )}
                      >
                        <m.icon className="w-4 h-4" />
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Payment Remark</label>
                  <input 
                    autoFocus
                    type="text"
                    value={markAsPaidRemark}
                    onChange={(e) => setMarkAsPaidRemark(e.target.value)}
                    placeholder="e.g. Paid via GPay, Transaction ID: 123..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setMarkingAsPaid(null)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 px-4 bg-accent text-white rounded-xl font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Confirm Payment'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Payment Sheet Modal */}
      <AnimatePresence>
        {showPaymentSheet && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPaymentSheet(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Payment Sheet</h2>
                  <p className="text-xs text-slate-500 mt-1">Review and process bulk payment for {selectedVehicle}</p>
                </div>
                <button onClick={() => setShowPaymentSheet(false)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh]">
                {/* Driver & Bank Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Driver Details</p>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Name</span>
                        <span className="text-sm font-bold text-slate-900">{getDriverForVehicle(selectedVehicle)?.name || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Phone</span>
                        <span className="text-sm font-bold text-slate-900">{getDriverForVehicle(selectedVehicle)?.phone || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-primary/5 rounded-3xl border border-primary/10">
                    <p className="text-[10px] font-bold text-primary/60 uppercase tracking-wider mb-4">Bank & UPI</p>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">A/C No</span>
                        <span className="text-sm font-bold text-slate-900">{getDriverForVehicle(selectedVehicle)?.bankAccount || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">IFSC</span>
                        <span className="text-sm font-bold text-slate-900">{getDriverForVehicle(selectedVehicle)?.ifsc || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-primary/10">
                        <span className="text-sm text-slate-500 font-bold">UPI ID</span>
                        <span className="text-sm font-bold text-primary">{getDriverForVehicle(selectedVehicle)?.upiId || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expense Breakdown */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">Expense Breakdown</p>
                  <div className="space-y-2">
                    {filteredExpenses.map(e => (
                      <div key={e.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                            <IndianRupee className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900">{e.category}</p>
                            <p className="text-[10px] text-slate-400">{new Date(e.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-slate-900">₹{e.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl mt-4">
                      <span className="font-bold">Total Amount</span>
                      <span className="text-xl font-black">₹{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                    {/* Export Options */}
                <div className="flex flex-wrap gap-3 pt-4">
                  <button 
                    onClick={() => handleExport('csv')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <Download className="w-4 h-4" /> CSV
                  </button>
                  <button 
                    onClick={() => handleExport('excel')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <Download className="w-4 h-4" /> Excel
                  </button>
                  <button 
                    onClick={() => handleExport('pdf')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    <Printer className="w-4 h-4" /> PDF
                  </button>
                </div>
              </div>

              <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                <button
                  onClick={() => setShowPaymentSheet(false)}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-slate-500 hover:bg-white transition-all border border-transparent hover:border-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBulkPayment}
                  disabled={submitting}
                  className="flex-1 py-4 px-6 bg-accent text-white rounded-2xl font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/10 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm & Mark All Paid'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pay Vehicle Confirmation */}
      <AnimatePresence>
        {selectedVehicleForPayment && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedVehicleForPayment(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-accent/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Truck className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Confirm Vehicle Payment</h3>
              <p className="text-slate-500 mb-2">
                Payout report for <span className="font-bold text-slate-900">{selectedVehicleForPayment}</span> has been generated.
              </p>
              <p className="text-slate-500 mb-8">
                Are you sure you want to mark all pending expenses for this vehicle as paid?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedVehicleForPayment(null)}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmVehiclePayment}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-accent text-white rounded-2xl font-bold hover:bg-accent/90 transition-all shadow-lg shadow-accent/10 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Paid'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
