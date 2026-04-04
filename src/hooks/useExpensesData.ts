import { MutableRefObject, useRef } from 'react';
import { Expense, Shipment, Driver, Vehicle } from '../types';
import { useData } from '../contexts/DataContext';

export interface UseExpensesDataReturn {
  expenses: Expense[];
  trips: Shipment[];
  drivers: Driver[];
  vehicles: Vehicle[];
  loading: boolean;
  fetchData: () => Promise<void>;
  fetchErrorShown: MutableRefObject<boolean>;
}

export function useExpensesData(
  _showToast: (message: string, type: 'success' | 'error' | 'info') => void
): UseExpensesDataReturn {
  const fetchErrorShown = useRef(false);
  const { expenses, shipments, drivers, vehicles, loading, refetch } = useData();

  return {
    expenses,
    trips: shipments,
    drivers,
    vehicles,
    loading,
    fetchData: refetch,
    fetchErrorShown,
  };
}
