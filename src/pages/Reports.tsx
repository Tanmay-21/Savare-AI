import React, { useState, useEffect } from 'react';
import { Shipment, Vehicle, Expense } from '../types';
import { apiFetch } from '../lib/api';
import { cn } from '../utils/cn';
import { 
  FileBarChart, 
  Download, 
  Calendar, 
  Truck, 
  IndianRupee,
  TrendingUp,
  Package,
  ChevronRight,
  Filter,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { 
  downloadDailyReport, 
  downloadAnnexureReport,
  downloadVehiclePerformanceReport 
} from '../utils/reportGenerator';
import { motion } from 'framer-motion';
import ExcelJS from 'exceljs';

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

type ReportTab = 'daily' | 'vehicle' | 'expense';

const COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335', '#8E44AD', '#2C3E50', '#16A085'];

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Process data for charts
  const expenseByCategory = expenses.reduce((acc: any[], curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += curr.amount;
    } else {
      acc.push({ name: curr.category, value: curr.amount });
    }
    return acc;
  }, []);

  const tripsByDate = shipments.reduce((acc: any[], curr) => {
    const date = curr.createdAt ? new Date(curr.createdAt).toLocaleDateString() : 'Unknown';
    const existing = acc.find(item => item.date === date);
    if (existing) {
      existing.count += 1;
    } else {
      acc.push({ date, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7);

  const vehicleUtilization = vehicles.map(v => {
    const tripCount = shipments.filter(s => s.vehicleId === v.id).length;
    return { name: v.plateNumber, trips: tripCount };
  }).sort((a, b) => b.trips - a.trips).slice(0, 5);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/shipments'),
      apiFetch('/api/vehicles'),
      apiFetch('/api/expenses'),
    ])
      .then(([shipmentList, vehicleList, expenseList]) => {
        setShipments(shipmentList);
        setVehicles(vehicleList);
        setExpenses(expenseList);
      })
      .catch((err) => console.error('Error fetching reports data:', err))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Total Trips', value: shipments.length, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Active Fleet', value: vehicles.length, icon: Truck, color: 'text-secondary', bg: 'bg-secondary/10' },
    { label: 'Paid Expenses', value: `₹ ${expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pending Payments', value: `₹ ${expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0).toLocaleString('en-IN')}`, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Analytics & Reports</h1>
          <p className="text-slate-500 mt-1">Insights into your business performance and fleet efficiency.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => downloadVehiclePerformanceReport(shipments, vehicles)}
            className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-semibold hover:bg-slate-50 transition-all shadow-sm"
          >
            <Truck className="w-5 h-5 text-primary" />
            Vehicle Performance
          </button>
          <button 
            onClick={() => downloadDailyReport(shipments, [], expenses, 'excel')}
            className="flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-2xl font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Download className="w-5 h-5" />
            Download All Data
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
          >
            <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-50">
          {(['daily', 'vehicle', 'expense'] as ReportTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-all relative ${
                activeTab === tab ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab} Reports
              {activeTab === tab && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-1 bg-primary"
                />
              )}
            </button>
          ))}
        </div>

        <div className="p-8">
          {activeTab === 'daily' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Trip Volume (Last 7 Days)</h3>
                    <button 
                      onClick={() => {
                        const workbook = new ExcelJS.Workbook();
                        const sheet = workbook.addWorksheet('Trip Volume');
                        sheet.columns = [
                          { header: 'Date', key: 'date', width: 20 },
                          { header: 'Trip Count', key: 'count', width: 15 }
                        ];
                        tripsByDate.forEach(d => sheet.addRow(d));
                        workbook.xlsx.writeBuffer().then(buffer => {
                          const blob = new Blob([buffer]);
                          const link = document.createElement('a');
                          link.href = window.URL.createObjectURL(blob);
                          link.download = `Trip_Volume_${new Date().getTime()}.xlsx`;
                          link.click();
                        });
                      }}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Excel
                    </button>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={tripsByDate}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line type="monotone" dataKey="count" stroke="#4285F4" strokeWidth={3} dot={{ r: 4, fill: '#4285F4' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Recent Trip Activity</h3>
                  <div className="space-y-3">
                    {shipments.slice(0, 4).map((shipment) => (
                      <div key={shipment.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100">
                            <Package className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{shipment.origin} → {shipment.destination}</p>
                            <p className="text-xs text-slate-500 capitalize">{shipment.status}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">
                            {shipment.estimatedArrival ? new Date(shipment.estimatedArrival).toLocaleDateString() : 'N/A'}
                          </p>
                          <p className="text-xs text-slate-400">Est. Arrival</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vehicle' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Top Performing Vehicles</h3>
                    <button 
                      onClick={() => {
                        const workbook = new ExcelJS.Workbook();
                        const sheet = workbook.addWorksheet('Vehicle Performance');
                        sheet.columns = [
                          { header: 'Vehicle No.', key: 'name', width: 20 },
                          { header: 'Trip Count', key: 'trips', width: 15 }
                        ];
                        vehicleUtilization.forEach(d => sheet.addRow(d));
                        workbook.xlsx.writeBuffer().then(buffer => {
                          const blob = new Blob([buffer]);
                          const link = document.createElement('a');
                          link.href = window.URL.createObjectURL(blob);
                          link.download = `Vehicle_Utilization_${new Date().getTime()}.xlsx`;
                          link.click();
                        });
                      }}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Excel
                    </button>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={vehicleUtilization}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="trips" fill="#34A853" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Fleet Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {['active', 'maintenance', 'inactive'].map(status => {
                      const count = vehicles.filter(v => v.status === status).length;
                      return (
                        <div key={status} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{status}</p>
                          <p className="text-2xl font-bold text-slate-900 mt-1">{count}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'expense' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900">Expenses by Category</h3>
                    <button 
                      onClick={() => {
                        const workbook = new ExcelJS.Workbook();
                        const sheet = workbook.addWorksheet('Expense Analysis');
                        sheet.columns = [
                          { header: 'Category', key: 'name', width: 20 },
                          { header: 'Total Amount', key: 'value', width: 15 }
                        ];
                        expenseByCategory.forEach(d => sheet.addRow(d));
                        workbook.xlsx.writeBuffer().then(buffer => {
                          const blob = new Blob([buffer]);
                          const link = document.createElement('a');
                          link.href = window.URL.createObjectURL(blob);
                          link.download = `Expense_Analysis_${new Date().getTime()}.xlsx`;
                          link.click();
                        });
                      }}
                      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Excel
                    </button>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {expenseByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-900">Recent Expenses</h3>
                  <div className="space-y-3">
                    {expenses.slice(0, 4).map((expense) => (
                      <div key={expense.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100">
                            <IndianRupee className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{expense.category}</p>
                            <p className="text-xs text-slate-500">{expense.status === 'paid' ? 'Paid' : 'Pending'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">₹{expense.amount.toLocaleString('en-IN')}</p>
                          <p className="text-xs text-slate-400">{new Date(expense.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
