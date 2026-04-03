import { useRef, useState, useEffect, MutableRefObject } from 'react';
import { Expense, Shipment, Driver, Vehicle } from '../types';
import { apiFetch } from '../lib/api';
import { parseApiError } from '../lib/parseApiError';

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
  showToast: (message: string, type: 'success' | 'error' | 'info') => void
): UseExpensesDataReturn {
  const fetchErrorShown = useRef(false);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<Shipment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

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
    expenses,
    trips,
    drivers,
    vehicles,
    loading,
    fetchData,
    fetchErrorShown,
  };
}
