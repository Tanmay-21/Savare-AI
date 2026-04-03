import { useRef, useState, useEffect, MutableRefObject } from 'react';
import { Shipment, Vehicle, Driver, Order, Expense } from '../types';
import { apiFetch } from '../lib/api';
import { parseApiError } from '../lib/parseApiError';

export interface UseShipmentsDataReturn {
  shipments: Shipment[];
  vehicles: Vehicle[];
  drivers: Driver[];
  expenses: Expense[];
  orders: Order[];
  loading: boolean;
  fetchData: () => Promise<void>;
  fetchErrorShown: MutableRefObject<boolean>;
}

export function useShipmentsData(
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
): UseShipmentsDataReturn {
  const fetchErrorShown = useRef(false);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
      if (!fetchErrorShown.current) {
        fetchErrorShown.current = true;
        showToast(parseApiError(error), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [showToast]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    shipments,
    vehicles,
    drivers,
    expenses,
    orders,
    loading,
    fetchData,
    fetchErrorShown,
  };
}
