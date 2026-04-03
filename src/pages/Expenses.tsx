import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Expense } from '../types';
import { apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { parseApiError } from '../lib/parseApiError';
import { useExpensesData } from '../hooks/useExpensesData';
import { downloadExpenseReport, downloadPayoutReport } from '../utils/reportGenerator';
import {
  Plus,
  Search,
  IndianRupee,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Loader2,
} from 'lucide-react';
import { DeleteExpenseModal } from '../components/expenses/DeleteExpenseModal';
import { ExpenseVehicleGroup } from '../components/expenses/ExpenseVehicleGroup';
import { PayAllConfirmModal } from '../components/expenses/PayAllConfirmModal';
import { MarkAsPaidModal } from '../components/expenses/MarkAsPaidModal';
import { PayVehicleModal } from '../components/expenses/PayVehicleModal';
import { PaymentSheetModal } from '../components/expenses/PaymentSheetModal';
import { ExpenseFormModal } from '../components/expenses/ExpenseFormModal';

export default function Expenses() {
  const { showToast } = useToast();
  const { expenses, trips, drivers, vehicles, loading, fetchData, fetchErrorShown } = useExpensesData(showToast);
  const [searchParams] = useSearchParams();
  const [selectedVehicle, setSelectedVehicle] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [reportDateRange, setReportDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
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

  const [expandedVehicles, setExpandedVehicles] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const tripIdParam = searchParams.get('tripId');
    if (tripIdParam) {
      setFormData(prev => ({ ...prev, tripId: tripIdParam }));
      setIsModalOpen(true);
    }
  }, [searchParams]);

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
        const creates = expenseItems
          .filter(item => item.amount > 0)
          .map(item => apiFetch('/api/expenses', {
            method: 'POST',
            body: JSON.stringify({ ...formData, category: item.category, amount: item.amount, description: item.description }),
          }));
        await Promise.all(creates);

        if (formData.tripId) {
          const trip = trips.find(t => t.id === formData.tripId);
          if (trip && trip.status === 'in-transit') {
            try {
              await apiFetch(`/api/shipments/${trip.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'delivered', actualArrival: new Date().toISOString() }),
              });
              showToast('Trip automatically marked as delivered.', 'info');
            } catch (deliveryErr) {
              console.error('Error auto-transitioning trip to delivered:', deliveryErr);
              showToast('Expenses saved, but failed to mark trip as delivered.', 'error');
            }
          }
        }
      }
      await fetchData();
      fetchErrorShown.current = false;
      closeModal();
      showToast(editingExpense ? 'Expense updated.' : 'Expense saved.', 'success');
    } catch (err) {
      console.error('Error saving expense:', err);
      showToast(parseApiError(err), 'error');
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
      showToast('Expense deleted.', 'success');
    } catch (err) {
      console.error('Error deleting expense:', err);
      showToast(parseApiError(err), 'error');
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

  const getDriverForVehicle = (vNumber: string) => {
    const vehicle = vehicles.find(v => v.plateNumber === vNumber);
    if (!vehicle) return null;
    return drivers.find(d => d.id === vehicle.currentDriverId) || null;
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
      showToast('Bulk payment marked as paid.', 'success');
    } catch (err) {
      console.error('Error with bulk payment:', err);
      showToast(parseApiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = (_format: 'csv' | 'excel' | 'pdf') => {
    // TODO: implement export — feature not yet available
  };

  const toggleVehicle = (vNumber: string) => {
    setExpandedVehicles(prev => ({ ...prev, [vNumber]: !prev[vNumber] }));
  };

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
        acc[vNumber].trips[tripId] = { tripId, tripDetails, expenses: [] };
      }
      acc[vNumber].trips[tripId].expenses.push(expense);
      return acc;
    }, {} as Record<string, any>);

  const visibleVehicles = Object.values(groupedByVehicle);

  const handlePayAllAll = async () => {
    if (activeTab !== 'pending') return;
    const pendingExpenses = expenses.filter(e => e.status === 'pending');
    if (pendingExpenses.length === 0) return;
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
      showToast('All expenses marked as paid.', 'success');
    } catch (err) {
      console.error('Error with pay-all:', err);
      showToast(parseApiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayVehicle = async (vNumber: string) => {
    const vehicleExpenses = expenses.filter(e => e.status === 'pending' && (e as any).vehicleNumber === vNumber);
    if (vehicleExpenses.length === 0) return;
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
      showToast('Vehicle expenses marked as paid.', 'success');
    } catch (err) {
      console.error('Error with vehicle payment:', err);
      showToast(parseApiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
      showToast('Expense marked as paid.', 'success');
    } catch (err) {
      console.error('Error marking as paid:', err);
      showToast(parseApiError(err), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const pendingCount = expenses.filter(e => e.status === 'pending').length;
  const paidCount = expenses.filter(e => e.status === 'paid').length;

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
              <ExpenseVehicleGroup
                key={vehicle.vehicleNumber}
                vehicle={vehicle}
                isExpanded={!!expandedVehicles[vehicle.vehicleNumber]}
                activeTab={activeTab}
                onToggle={toggleVehicle}
                onPayVehicle={handlePayVehicle}
                onMarkAsPaid={(expense) => {
                  setMarkingAsPaid({ ...expense, selectedPaymentMethod: 'cash' } as any);
                  setMarkAsPaidRemark('Paid in Cash');
                }}
                onEdit={(expense) => openModal(expense)}
                onDelete={(id) => setDeleteId(id)}
              />
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

      <ExpenseFormModal
        isOpen={isModalOpen}
        editingExpense={editingExpense}
        formData={formData}
        setFormData={setFormData}
        expenseItems={expenseItems}
        setExpenseItems={setExpenseItems}
        trips={trips}
        vehicles={vehicles}
        drivers={drivers}
        expenses={expenses}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      <PayAllConfirmModal
        isOpen={showPayAllConfirm}
        pendingCount={expenses.filter(e => e.status === 'pending').length}
        submitting={submitting}
        onCancel={() => setShowPayAllConfirm(false)}
        onConfirm={confirmPayAllAll}
      />

      <DeleteExpenseModal
        isOpen={!!deleteId}
        submitting={submitting}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
      />

      <MarkAsPaidModal
        expense={markingAsPaid}
        remark={markAsPaidRemark}
        submitting={submitting}
        onRemarkChange={setMarkAsPaidRemark}
        onPaymentMethodChange={(method) => {
          if (!markingAsPaid) return;
          setMarkAsPaidRemark(method === 'cash' ? 'Paid in Cash' : 'Paid Online');
          setMarkingAsPaid({ ...markingAsPaid, selectedPaymentMethod: method } as any);
        }}
        onClose={() => setMarkingAsPaid(null)}
        onSubmit={handleMarkAsPaid}
      />

      <PaymentSheetModal
        isOpen={showPaymentSheet}
        selectedVehicle={selectedVehicle}
        filteredExpenses={filteredExpenses}
        driver={getDriverForVehicle(selectedVehicle)}
        submitting={submitting}
        onClose={() => setShowPaymentSheet(false)}
        onConfirm={confirmBulkPayment}
        onExport={handleExport}
      />

      <PayVehicleModal
        vehicleNumber={selectedVehicleForPayment}
        submitting={submitting}
        onCancel={() => setSelectedVehicleForPayment(null)}
        onConfirm={confirmVehiclePayment}
      />
    </div>
  );
}
