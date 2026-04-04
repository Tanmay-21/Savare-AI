import { MutableRefObject, useRef } from 'react';
import { Shipment, Vehicle, Driver, Order, Expense } from '../types';
import { useData } from '../contexts/DataContext';

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
  _showToast: (message: string, type: 'success' | 'error' | 'info') => void
): UseShipmentsDataReturn {
  const fetchErrorShown = useRef(false);
  const { shipments, vehicles, drivers, expenses, orders, loading, refetch } = useData();

  return {
    shipments,
    vehicles,
    drivers,
    expenses,
    orders,
    loading,
    fetchData: refetch,
    fetchErrorShown,
  };
}
