import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { parseApiError } from '../lib/parseApiError';
import { Truck, Users, Package, TrendingUp, Clock, MapPin, AlertCircle, CheckCircle2, IndianRupee, Settings, Activity, Plus, HelpCircle, ArrowRight, X, Loader2, FileText, HardHat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Shipment, Order } from '../types';
import { cn } from '../utils/cn';
import { APP_NAME, SUPPORT_EMAIL, SUPPORT_PHONE } from '../constants/branding';
import ComingSoonModal from '../components/ComingSoonModal';

import { useUser } from '../hooks/useUser';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { showToast } = useToast();
  const fetchErrorShown = useRef(false);
  const [stats, setStats] = useState({
    vehicles: 0,
    drivers: 0,
    totalTrips: 0,
    activeTrips: 0,
    completedTrips: 0,
    tripsThisMonth: 0,
    activeOrders: 0,
    vehiclesMaintenance: 0,
  });
  const [recentTrips, setRecentTrips] = useState<Shipment[]>([]);
  const [isComingSoonOpen, setIsComingSoonOpen] = useState(false);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [vehicles, drivers, trips, orders] = await Promise.all([
          apiFetch('/api/vehicles'),
          apiFetch('/api/drivers'),
          apiFetch('/api/shipments'),
          apiFetch('/api/orders'),
        ]);

        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        setRecentTrips(trips);
        setStats({
          vehicles: vehicles.length,
          drivers: drivers.length,
          totalTrips: trips.length,
          activeTrips: trips.filter((t: Shipment) => t.status === 'in-transit').length,
          completedTrips: trips.filter((t: Shipment) => t.status === 'delivered').length,
          tripsThisMonth: trips.filter((t: Shipment) => t.createdAt && new Date(t.createdAt) >= firstDayOfMonth).length,
          activeOrders: orders.filter((o: Order) => o.status !== 'completed').length,
          vehiclesMaintenance: vehicles.filter((v: { status: string }) => v.status === 'maintenance').length,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        if (!fetchErrorShown.current) {
          fetchErrorShown.current = true;
          showToast(parseApiError(error), 'error');
        }
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000);
    return () => clearInterval(interval);
  }, [showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  const cards = [
    { name: 'Active Fleet', value: stats.vehicles, icon: Truck, color: 'bg-primary/10 text-primary', trend: '+2 this week' },
    { name: 'Active Orders', value: stats.activeOrders, icon: FileText, color: 'bg-accent/10 text-accent', trend: 'Bulk tracking' },
    { name: 'Ongoing Trips', value: stats.activeTrips, icon: TrendingUp, color: 'bg-primary/10 text-primary', trend: 'High volume' },
    { name: 'Trips this Month', value: stats.tripsThisMonth, icon: Package, color: 'bg-accent/10 text-accent', trend: 'Monthly volume' },
  ];

  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Derive weekly trip volume from real data
  const chartData = React.useMemo(() => {
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);

    return DAYS.map((day, i) => {
      const dayStart = new Date(monday);
      dayStart.setDate(monday.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      const count = recentTrips.filter((t: Shipment) => {
        if (!t.createdAt) return false;
        const d = new Date(t.createdAt);
        return d >= dayStart && d < dayEnd;
      }).length;
      return { day, trips: count };
    });
  }, [recentTrips]);

  return (
    <div className="space-y-8 pb-12">
      <ComingSoonModal 
        isOpen={isComingSoonOpen} 
        onClose={() => setIsComingSoonOpen(false)} 
      />

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Hello, <span className="text-primary">{user?.companyName || 'Partner'}</span>!
          </h1>
          <p className="text-slate-500 mt-2 text-lg">Here's what's happening with your fleet today.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsHelpModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-primary/10 text-primary rounded-2xl text-sm font-bold hover:bg-primary/20 transition-all"
          >
            <AlertCircle className="w-5 h-5" />
            Need Help?
          </button>
        </div>
      </header>

      {/* Help Modal */}
      <AnimatePresence>
        {isHelpModalOpen && (
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
                      <AlertCircle className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">How to use {APP_NAME}?</h2>
                      <p className="text-slate-500">A simple guide for your business.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsHelpModalOpen(false)}
                    className="p-2 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold">1</div>
                        <h3 className="font-bold text-slate-900">Add Your Fleet</h3>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Go to <strong>Vehicles</strong> and <strong>Drivers</strong> to add your trucks and staff. This is the first step to start tracking.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/10 text-accent rounded-lg flex items-center justify-center font-bold">2</div>
                        <h3 className="font-bold text-slate-900">Create an Order</h3>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Go to <strong>Orders</strong> and click <strong>"New Order"</strong>. Enter the company, locations, and number of containers.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-accent/10 text-accent rounded-lg flex items-center justify-center font-bold">3</div>
                        <h3 className="font-bold text-slate-900">Assign Trips</h3>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        Once an order is created, go to <strong>Trips</strong>. You will see pending trips from your orders. Assign a vehicle and driver to start.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 text-primary rounded-lg flex items-center justify-center font-bold">4</div>
                        <h3 className="font-bold text-slate-900">Record Expenses</h3>
                      </div>
                      <p className="text-sm text-slate-500 leading-relaxed">
                        When a trip is delivered, record fuel, tolls, and other costs in <strong>Expenses</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                    <p className="text-sm font-bold text-slate-900 mb-2">Still need help?</p>
                    <p className="text-xs text-slate-500">Contact our support team at <span className="text-primary font-bold">{SUPPORT_EMAIL}</span> or call <span className="text-primary font-bold">{SUPPORT_PHONE}</span>.</p>
                  </div>

                  <button
                    onClick={() => setIsHelpModalOpen(false)}
                    className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                  >
                    Got it, Thanks!
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Quick Actions - More Prominent */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: 'New Order', icon: Package, link: '/app/orders', color: 'bg-accent', shadow: 'shadow-accent/10' },
          { name: 'Add Vehicle', icon: Truck, link: '/app/vehicles', color: 'bg-primary', shadow: 'shadow-primary/10', restricted: true },
          { name: 'Add Driver', icon: Users, link: '/app/drivers', color: 'bg-primary', shadow: 'shadow-primary/10', restricted: true },
          { name: 'Settings', icon: Settings, link: '/app/settings', color: 'bg-slate-600', shadow: 'shadow-slate-100' },
        ].map((action) => (
          <button
            key={action.name}
            onClick={() => {
              if (user?.role === 'CHA' && action.restricted) {
                setIsComingSoonOpen(true);
              } else {
                navigate(action.link);
              }
            }}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-4 p-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300",
              user?.role === 'CHA' && action.restricted && "opacity-60 grayscale-[0.5]"
            )}
          >
            <div className={`w-16 h-16 ${action.color} rounded-2xl flex items-center justify-center text-white shadow-lg ${action.shadow} group-hover:scale-110 transition-transform duration-300`}>
              <action.icon className="w-8 h-8" />
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold text-slate-900">{action.name}</span>
              {user?.role === 'CHA' && action.restricted && (
                <span className="text-[10px] font-black text-primary uppercase tracking-widest mt-1">Coming Soon</span>
              )}
            </div>
            <div className="absolute top-4 right-4 w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {user?.role === 'CHA' && action.restricted ? <HardHat className="w-4 h-4 text-primary" /> : <Plus className="w-4 h-4 text-slate-400" />}
            </div>
          </button>
        ))}
      </section>

      {/* Help & Guide - More Accessible */}
      <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
              <AlertCircle className="w-4 h-4" />
              Getting Started Guide
            </div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight">
              New to {APP_NAME}? <br />
              <span className="text-slate-400">Let's get you started in 3 steps.</span>
            </h2>
            <div className="space-y-4">
              {[
                { step: 1, title: 'Register Fleet', desc: 'Add your vehicles and drivers first.', icon: Truck, color: 'text-primary', bg: 'bg-primary/10', restricted: true },
                { step: 2, title: 'Create Order', desc: 'Go to Orders and click "New Order".', icon: Package, color: 'text-accent', bg: 'bg-accent/10' },
                { step: 3, title: 'Assign Trips', desc: 'Assign vehicles to pending trips.', icon: TrendingUp, color: 'text-accent', bg: 'bg-accent/10', restricted: true },
              ].map((item) => (
                <div 
                  key={item.step} 
                  onClick={() => {
                    if (user?.role === 'CHA' && item.restricted) {
                      setIsComingSoonOpen(true);
                    }
                  }}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group cursor-pointer",
                    user?.role === 'CHA' && item.restricted && "opacity-60"
                  )}
                >
                  <div className={cn("w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg", item.bg, item.color)}>
                    {item.step}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      {item.title}
                      {user?.role === 'CHA' && item.restricted ? <HardHat className={cn("w-4 h-4", item.color)} /> : <item.icon className={cn("w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity", item.color)} />}
                    </p>
                    <p className="text-sm text-slate-500">
                      {user?.role === 'CHA' && item.restricted ? 'Internal fleet management is coming soon for CHAs.' : item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="w-full md:w-1/3 aspect-square bg-slate-50 rounded-[2.5rem] flex items-center justify-center relative group">
            <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] scale-90 group-hover:scale-100 transition-transform duration-500" />
            <Activity className="w-32 h-32 text-primary/20 animate-pulse" />
            <div className="absolute -bottom-6 -right-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-100 max-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Live</span>
              </div>
              <p className="text-xs font-bold text-slate-900">Your business is running smoothly today!</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, index) => (
          <motion.div
            key={card.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.color} group-hover:scale-110 transition-transform`}>
                <card.icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 px-2 py-1 rounded">Real-time</span>
            </div>
            <p className="text-slate-500 text-sm font-medium">{card.name}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-bold text-slate-900">{card.value}</h3>
              <span className="text-xs font-medium text-emerald-600">{card.trend}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trip Volume Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="font-bold text-slate-900">Trip Volume</h2>
              <p className="text-xs text-slate-500">Weekly performance metrics</p>
            </div>
            <select className="text-xs font-semibold bg-slate-50 border-none rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="trips" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.trips > 0 ? '#013068' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Status */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          {(() => {
            const activeVehicles = Math.max(0, stats.vehicles - stats.vehiclesMaintenance);
            const idleVehicles = Math.max(0, activeVehicles - stats.activeTrips);
            const activePercent = stats.vehicles > 0
              ? Math.round((activeVehicles / stats.vehicles) * 100)
              : 0;
            const fleetItems = [
              { label: 'On Road', count: stats.activeTrips, color: 'bg-emerald-500' },
              { label: 'Maintenance', count: stats.vehiclesMaintenance, color: 'bg-orange-500' },
              { label: 'Idle', count: idleVehicles, color: 'bg-slate-300' },
            ];
            return (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-slate-900">Fleet Status</h2>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                    {activePercent}% Active
                  </span>
                </div>
                <div className="space-y-4">
                  {fleetItems.map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs font-bold mb-1.5">
                        <span className="text-slate-600">{item.label}</span>
                        <span className="text-slate-900">{item.count} Vehicles</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color}`}
                          style={{ width: stats.vehicles > 0 ? `${Math.max(5, (item.count / stats.vehicles) * 100)}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}

                  {stats.vehiclesMaintenance > 0 && (
                    <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-orange-900">Maintenance Alert</p>
                        <p className="text-[10px] text-orange-700 mt-0.5">
                          {stats.vehiclesMaintenance} vehicle{stats.vehiclesMaintenance > 1 ? 's' : ''} currently in maintenance.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Removed Recent Activity table as per request */}
    </div>
  );
}
