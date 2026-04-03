import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExpensesData } from './useExpensesData';

vi.mock('../lib/api', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../lib/parseApiError', () => ({
  parseApiError: vi.fn((err: unknown) => `Parsed: ${String(err)}`),
}));

import { apiFetch } from '../lib/api';

const mockApiFetch = apiFetch as ReturnType<typeof vi.fn>;

const MOCK_EXPENSES = [{ id: 'e1', category: 'Fuel', amount: 100 }];
const MOCK_SHIPMENTS = [{ id: 's1', tripId: 'T-001' }];
const MOCK_DRIVERS = [{ id: 'd1', name: 'Driver One' }];
const MOCK_VEHICLES = [{ id: 'v1', plateNumber: 'MH01AB1234' }];

describe('useExpensesData', () => {
  // Using a typed mock function
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
    const { result } = renderHook(() => useExpensesData(showToast));

    expect(result.current.loading).toBe(true);
    expect(result.current.expenses).toEqual([]);
    expect(result.current.trips).toEqual([]);
    expect(result.current.drivers).toEqual([]);
    expect(result.current.vehicles).toEqual([]);
  });

  it('populates all four arrays after a successful fetch', async () => {
    mockApiFetch
      .mockResolvedValueOnce(MOCK_EXPENSES)
      .mockResolvedValueOnce(MOCK_SHIPMENTS)
      .mockResolvedValueOnce(MOCK_DRIVERS)
      .mockResolvedValueOnce(MOCK_VEHICLES);

    const { result } = renderHook(() => useExpensesData(showToast));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.expenses).toEqual(MOCK_EXPENSES);
    expect(result.current.trips).toEqual(MOCK_SHIPMENTS);
    expect(result.current.drivers).toEqual(MOCK_DRIVERS);
    expect(result.current.vehicles).toEqual(MOCK_VEHICLES);
  });

  it('sets loading to false after fetch completes', async () => {
    mockApiFetch.mockResolvedValue([]);

    const { result } = renderHook(() => useExpensesData(showToast));

    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it('calls showToast with parsed error on fetch failure', async () => {
    const fetchError = new Error('Network error');
    mockApiFetch.mockRejectedValue(fetchError);

    const { result } = renderHook(() => useExpensesData(showToast));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(showToastMock).toHaveBeenCalledWith(
      expect.stringContaining('Parsed:'),
      'error'
    );
  });

  it('only calls showToast once even when fetchData is called multiple times on error', async () => {
    const fetchError = new Error('Network error');
    mockApiFetch.mockRejectedValue(fetchError);

    const { result } = renderHook(() => useExpensesData(showToast));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Call fetchData a second time (still failing)
    await act(async () => {
      await result.current.fetchData();
    });

    // showToast should only be called once due to fetchErrorShown ref guard
    expect(showToastMock).toHaveBeenCalledTimes(1);
  });

  it('exposes fetchErrorShown ref', () => {
    mockApiFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useExpensesData(showToast));

    expect(result.current.fetchErrorShown).toBeDefined();
    expect(typeof result.current.fetchErrorShown).toBe('object');
    expect('current' in result.current.fetchErrorShown).toBe(true);
  });

  it('exposes fetchData function', () => {
    mockApiFetch.mockResolvedValue([]);
    const { result } = renderHook(() => useExpensesData(showToast));

    expect(typeof result.current.fetchData).toBe('function');
  });

  it('fetches the correct four API endpoints', async () => {
    mockApiFetch.mockResolvedValue([]);

    const { result } = renderHook(() => useExpensesData(showToast));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const calledPaths = mockApiFetch.mock.calls.map((call) => call[0] as string);
    expect(calledPaths).toContain('/api/expenses');
    expect(calledPaths).toContain('/api/shipments');
    expect(calledPaths).toContain('/api/drivers');
    expect(calledPaths).toContain('/api/vehicles');
  });
});
