import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useShipmentsData } from './useShipmentsData';

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

describe('useShipmentsData', () => {
  let showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  let showToastMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    showToastMock = vi.fn();
    showToast = showToastMock as unknown as (message: string, type: 'success' | 'error' | 'info') => void;
    mockApiFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has correct initial state: loading=true, all arrays empty', () => {
    mockApiFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useShipmentsData(showToast));

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
      .mockResolvedValueOnce(MOCK_EXPENSES)
      .mockResolvedValueOnce(MOCK_ORDERS);

    const { result } = renderHook(() => useShipmentsData(showToast));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.shipments).toEqual(MOCK_SHIPMENTS);
    expect(result.current.vehicles).toEqual(MOCK_VEHICLES);
    expect(result.current.drivers).toEqual(MOCK_DRIVERS);
    expect(result.current.expenses).toEqual(MOCK_EXPENSES);
    expect(result.current.orders).toEqual(MOCK_ORDERS);
  });

  it('sets loading to false after fetch completes', async () => {
    mockApiFetch.mockResolvedValue([]);

    const { result } = renderHook(() => useShipmentsData(showToast));

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('calls showToast with parsed error on fetch failure', async () => {
    const fetchError = new Error('Network error');
    mockApiFetch.mockRejectedValue(fetchError);

    const { result } = renderHook(() => useShipmentsData(showToast));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(showToastMock).toHaveBeenCalledWith(
      expect.stringContaining('Parsed:'),
      'error'
    );
  });

  it('only calls showToast once even when fetchData is called multiple times on error', async () => {
    const fetchError = new Error('Network error');
    mockApiFetch.mockRejectedValue(fetchError);

    const { result } = renderHook(() => useShipmentsData(showToast));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.fetchData();
    });

    expect(showToastMock).toHaveBeenCalledTimes(1);
  });

  it('exposes fetchErrorShown ref', () => {
    mockApiFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useShipmentsData(showToast));

    expect(result.current.fetchErrorShown).toBeDefined();
    expect('current' in result.current.fetchErrorShown).toBe(true);
  });

  it('exposes fetchData function', () => {
    mockApiFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useShipmentsData(showToast));

    expect(typeof result.current.fetchData).toBe('function');
  });

  it('fetches the correct five API endpoints', async () => {
    mockApiFetch.mockResolvedValue([]);

    const { result } = renderHook(() => useShipmentsData(showToast));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const calledPaths = mockApiFetch.mock.calls.map((call) => call[0] as string);
    expect(calledPaths).toContain('/api/shipments');
    expect(calledPaths).toContain('/api/vehicles');
    expect(calledPaths).toContain('/api/drivers');
    expect(calledPaths).toContain('/api/expenses');
    expect(calledPaths).toContain('/api/orders');
  });
});
