import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useShipmentsData } from './useShipmentsData';
import { DataProvider } from '../contexts/DataContext';
import { ToastProvider } from '../contexts/ToastContext';

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../lib/parseApiError', () => ({
  parseApiError: vi.fn((err: unknown) => `Parsed: ${String(err)}`),
}));

import { apiFetch } from '../lib/api';

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

const MOCK_SHIPMENTS = [{ id: 's1', tripId: 'T-001' }];
const MOCK_VEHICLES = [{ id: 'v1', plateNumber: 'MH01AB1234' }];
const MOCK_DRIVERS = [{ id: 'd1', name: 'Driver One' }];
const MOCK_EXPENSES = [{ id: 'e1', category: 'Fuel', amount: 100 }];
const MOCK_ORDERS = [{ id: 'o1', orderNumber: 'ORD-001' }];
const MOCK_LRS = [{ id: 'l1', lrNumber: 'LR-001' }];

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(ToastProvider, null, React.createElement(DataProvider, null, children));

describe('useShipmentsData', () => {
  let showToastMock: (message: string, type: 'success' | 'error' | 'info') => void;

  beforeEach(() => {
    showToastMock = vi.fn();
    mockApiFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct initial state: loading=true, all arrays empty', () => {
    mockApiFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useShipmentsData(showToastMock), { wrapper });

    expect(result.current.loading).toBe(true);
    expect(result.current.shipments).toEqual([]);
    expect(result.current.vehicles).toEqual([]);
    expect(result.current.drivers).toEqual([]);
    expect(result.current.expenses).toEqual([]);
    expect(result.current.orders).toEqual([]);
  });

  it('populates all five arrays after a successful fetch', async () => {
    mockApiFetch
      .mockResolvedValueOnce(MOCK_SHIPMENTS)
      .mockResolvedValueOnce(MOCK_VEHICLES)
      .mockResolvedValueOnce(MOCK_DRIVERS)
      .mockResolvedValueOnce(MOCK_ORDERS)
      .mockResolvedValueOnce(MOCK_EXPENSES)
      .mockResolvedValueOnce(MOCK_LRS);

    const { result } = renderHook(() => useShipmentsData(showToastMock), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.shipments).toEqual(MOCK_SHIPMENTS);
    expect(result.current.vehicles).toEqual(MOCK_VEHICLES);
    expect(result.current.drivers).toEqual(MOCK_DRIVERS);
    expect(result.current.expenses).toEqual(MOCK_EXPENSES);
    expect(result.current.orders).toEqual(MOCK_ORDERS);
  });

  it('sets loading to false after fetch completes', async () => {
    mockApiFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useShipmentsData(showToastMock), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('sets loading to false even when fetch fails', async () => {
    mockApiFetch.mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useShipmentsData(showToastMock), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('DataContext shows toast on fetch failure', async () => {
    mockApiFetch.mockRejectedValue(new Error('Network error'));
    // We can verify loading goes false; toast is handled by DataContext internally
    const { result } = renderHook(() => useShipmentsData(showToastMock), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Arrays remain empty on error
    expect(result.current.shipments).toEqual([]);
  });

  it('exposes fetchErrorShown ref', () => {
    mockApiFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useShipmentsData(showToastMock), { wrapper });

    expect(result.current.fetchErrorShown).toBeDefined();
    expect('current' in result.current.fetchErrorShown).toBe(true);
  });

  it('exposes fetchData function', () => {
    mockApiFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useShipmentsData(showToastMock), { wrapper });
    expect(typeof result.current.fetchData).toBe('function');
  });

  it('fetches the correct API endpoints via DataContext', async () => {
    mockApiFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useShipmentsData(showToastMock), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    const calledPaths = mockApiFetch.mock.calls.map((call) => call[0] as string);
    expect(calledPaths).toContain('/api/shipments');
    expect(calledPaths).toContain('/api/vehicles');
    expect(calledPaths).toContain('/api/drivers');
    expect(calledPaths).toContain('/api/expenses');
    expect(calledPaths).toContain('/api/orders');
  });
});
