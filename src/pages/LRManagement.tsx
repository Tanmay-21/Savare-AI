import React, { useState, useMemo } from 'react';
import { Shipment, Order, LR, Vehicle } from '../types';
import { apiFetch } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { parseApiError } from '../lib/parseApiError';
import { useData } from '../contexts/DataContext';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  Package,
  Layers,
  ChevronRight,
  Download,
  AlertCircle,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { downloadLR } from '../utils/reportGenerator';
import { downloadLRsAsZip } from '../utils/lrBulkDownload';

export default function LRManagement() {
  const { showToast } = useToast();
  const { shipments, orders, vehicles, lrs, loading, refetch: fetchData } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'generated'>('pending');
  const [generating, setGenerating] = useState<string | null>(null);
  const [bulkGeneratingOrders, setBulkGeneratingOrders] = useState<Set<string>>(new Set());
  const [generatedOrderFilter, setGeneratedOrderFilter] = useState<string>('all');
  const [bulkDownloading, setBulkDownloading] = useState(false);

  // Pre-index LRs by lrNumber to avoid O(N) scan per row
  const lrsByNumber = useMemo(
    () => new Map(lrs.map(lr => [lr.lrNumber, lr])),
    [lrs]
  );

  const generateLR = async (shipmentId: string) => {
    const shipment = shipments.find(s => s.id === shipmentId);
    if (!shipment || shipment.lrNumber) return;

    setGenerating(shipmentId);
    try {
      await apiFetch('/api/lrs/generate', {
        method: 'POST',
        body: JSON.stringify({ shipmentId, orderId: shipment.orderId }),
      });
      await fetchData();
      showToast('LR generated successfully.', 'success');
    } catch (err) {
      showToast(parseApiError(err), 'error');
    } finally {
      setGenerating(null);
    }
  };

  const generateBulkLRs = async (orderId: string) => {
    const orderShipments = shipments.filter(
      s => s.orderId === orderId && !s.lrNumber && s.status === 'delivered'
    );
    if (orderShipments.length === 0) return;

    setBulkGeneratingOrders(prev => new Set(prev).add(orderId));
    try {
      // Generate LRs sequentially to maintain atomic sequence ordering
      for (const shipment of orderShipments) {
        await apiFetch('/api/lrs/generate', {
          method: 'POST',
          body: JSON.stringify({ shipmentId: shipment.id, orderId }),
        });
      }
      await fetchData();
      showToast('All LRs generated successfully.', 'success');
    } catch (err) {
      await fetchData();
      showToast(parseApiError(err), 'error');
    } finally {
      setBulkGeneratingOrders(prev => { const next = new Set(prev); next.delete(orderId); return next; });
    }
  };

  const filteredShipments = useMemo(() => shipments.filter(s => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (s.tripId?.toLowerCase() || '').includes(term) ||
      (s.containerNumber?.toLowerCase() || '').includes(term) ||
      (s.billingPartyName?.toLowerCase() || '').includes(term) ||
      (s.lrNumber?.toLowerCase() || '').includes(term);

    const matchesTab =
      activeTab === 'pending'
        ? !s.lrNumber && s.status === 'delivered'
        : !!s.lrNumber;

    const matchesOrderFilter =
      activeTab !== 'generated' ||
      generatedOrderFilter === 'all' ||
      s.orderId === generatedOrderFilter;

    return matchesSearch && matchesTab && matchesOrderFilter;
  }), [shipments, searchTerm, activeTab, generatedOrderFilter]);

  const pendingOrders = useMemo(
    () => orders.filter(o => shipments.some(s => s.orderId === o.id && !s.lrNumber && s.status === 'delivered')),
    [orders, shipments]
  );

  const generatedOrders = useMemo(
    () => orders.filter(o => shipments.some(s => s.orderId === o.id && !!s.lrNumber)),
    [orders, shipments]
  );

  const handleBulkDownload = async () => {
    setBulkDownloading(true);
    try {
      const result = await downloadLRsAsZip(filteredShipments, orders, vehicles);
      if (result.failed > 0) {
        showToast(`Downloaded ${result.success} LR${result.success !== 1 ? 's' : ''}. ${result.failed} failed.`, 'error');
      } else {
        showToast(`Downloaded ${result.success} LR${result.success !== 1 ? 's' : ''} successfully.`, 'success');
      }
    } catch (err) {
      showToast(parseApiError(err), 'error');
    } finally {
      setBulkDownloading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">LR Management</h1>
        <p className="text-slate-500 mt-1">Generate and manage Lorry Receipts with fiscal year sequencing.</p>
      </header>

      {/* Bulk Section */}
      {activeTab === 'pending' && pendingOrders.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
            <Layers className="w-4 h-4" />
            Bulk LR Generation (By Order)
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingOrders.map(order => {
              const pendingCount = shipments.filter(
                s => s.orderId === order.id && !s.lrNumber && s.status === 'delivered'
              ).length;
              return (
                <div key={order.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-slate-900">{order.orderNumber}</h3>
                      <p className="text-xs text-slate-500">{order.billingPartyName}</p>
                    </div>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg uppercase">
                      {pendingCount} Pending
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase mb-4">
                    <span>{order.origin}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{order.destination}</span>
                  </div>
                  <button
                    onClick={() => { if (order.id) generateBulkLRs(order.id); }}
                    disabled={!order.id || bulkGeneratingOrders.has(order.id)}
                    className="w-full py-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {order.id && bulkGeneratingOrders.has(order.id) ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                    Generate {pendingCount} LRs
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Main List */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl">
            <button
              onClick={() => { setActiveTab('pending'); setGeneratedOrderFilter('all'); }}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === 'pending' ? "bg-white text-primary shadow-sm" : "text-slate-500"
              )}
            >
              Pending LRs
            </button>
            <button
              onClick={() => { setActiveTab('generated'); setGeneratedOrderFilter('all'); }}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === 'generated' ? "bg-white text-primary shadow-sm" : "text-slate-500"
              )}
            >
              Generated LRs
            </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap md:flex-nowrap">
            {activeTab === 'generated' && (
              <>
                <select
                  value={generatedOrderFilter}
                  onChange={(e) => setGeneratedOrderFilter(e.target.value)}
                  className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-xs font-medium text-slate-600 transition-all"
                >
                  <option value="all">All Orders</option>
                  {generatedOrders.map(o => (
                    <option key={o.id} value={o.id}>{o.orderNumber}</option>
                  ))}
                </select>
                <button
                  onClick={handleBulkDownload}
                  disabled={bulkDownloading || filteredShipments.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shrink-0"
                >
                  {bulkDownloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
                  Download All
                </button>
              </>
            )}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search Trip, Container, LR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-primary text-sm transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trip / Order</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Route</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Container</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {activeTab === 'pending' ? 'Trip Status' : 'LR Number'}
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                  </tr>
                ))
              ) : filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Package className="w-12 h-12 text-slate-200" />
                      <p className="text-slate-400 text-sm font-medium">No shipments found in this category.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredShipments.map(shipment => (
                  <tr key={shipment.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{shipment.tripId}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{shipment.billingPartyName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <span>{shipment.origin}</span>
                        <ArrowRight className="w-3 h-3 text-slate-300" />
                        <span>{shipment.destination}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-600">{shipment.containerNumber || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4">
                      {activeTab === 'pending' ? (
                        <span className="px-2 py-1 bg-accent/10 text-accent text-[10px] font-black rounded-lg uppercase border border-accent/20">
                          Delivered
                        </span>
                      ) : (
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-primary">{shipment.lrNumber}</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {lrsByNumber.get(shipment.lrNumber!)?.createdAt
                              ? new Date(lrsByNumber.get(shipment.lrNumber!)!.createdAt).toLocaleDateString()
                              : ''}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {activeTab === 'pending' ? (
                        <button
                          onClick={() => generateLR(shipment.id!)}
                          disabled={generating === shipment.id}
                          className="px-4 py-2 bg-primary text-white rounded-xl text-[10px] font-black uppercase hover:bg-primary/90 transition-all flex items-center gap-2 ml-auto disabled:opacity-50"
                        >
                          {generating === shipment.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
                          Generate LR
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const order = orders.find(o => o.id === shipment.orderId);
                            const vehicle = vehicles.find(v => v.id === shipment.vehicleId);
                            downloadLR(shipment, order, vehicle);
                          }}
                          className="p-2 text-slate-400 hover:text-primary hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0">
          <AlertCircle className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h4 className="font-bold text-blue-900">LR Sequencing Note</h4>
          <p className="text-sm text-blue-700 mt-1">
            LR numbers are generated based on the current fiscal year (April to March). 
            The system automatically handles sequence increments to prevent duplicates, even during bulk generation.
          </p>
        </div>
      </div>
    </div>
  );
}
