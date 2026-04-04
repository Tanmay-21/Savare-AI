import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Shipment, Vehicle, Driver, Order, Expense, LR } from '../types';
import { apiFetch } from '../lib/api';
import { parseApiError } from '../lib/parseApiError';
import { useToast } from './ToastContext';

const POLL_INTERVAL = 30000;

interface DataState {
  shipments: Shipment[];
  vehicles: Vehicle[];
  drivers: Driver[];
  orders: Order[];
  expenses: Expense[];
  lrs: LR[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DataContext = createContext<DataState | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [lrs, setLrs] = useState<LR[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);
  const errorShownRef = useRef(false);

  const refetch = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const [shipmentList, vehicleList, driverList, orderList, expenseList, lrList] =
        await Promise.all([
          apiFetch<Shipment[]>('/api/shipments'),
          apiFetch<Vehicle[]>('/api/vehicles'),
          apiFetch<Driver[]>('/api/drivers'),
          apiFetch<Order[]>('/api/orders'),
          apiFetch<Expense[]>('/api/expenses'),
          apiFetch<LR[]>('/api/lrs'),
        ]);
      setShipments(shipmentList);
      setVehicles(vehicleList);
      setDrivers(driverList);
      setOrders(orderList);
      setExpenses(expenseList);
      setLrs(lrList);
      setError(null);
      errorShownRef.current = false;
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        showToast(message, 'error');
      }
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refetch();
    const interval = setInterval(refetch, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refetch]);

  return (
    <DataContext.Provider value={{ shipments, vehicles, drivers, orders, expenses, lrs, loading, error, refetch }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataState {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
