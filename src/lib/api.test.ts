import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, keysToSnake } from './api';

// Mock the supabase client
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

import { supabase } from '../supabase';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it('includes Authorization header with access token', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'test-jwt-token' } },
      error: null,
    } as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: 'result' }),
    } as any);

    await apiFetch('/api/orders');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/orders',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer test-jwt-token',
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  it('merges custom headers with auth headers', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    } as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as any);

    await apiFetch('/api/orders', {
      headers: { 'X-Custom': 'val' },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/orders',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer tok',
          'X-Custom': 'val',
        }),
      })
    );
  });

  it('throws on non-ok response', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    } as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('Unauthorized'),
    } as any);

    await expect(apiFetch('/api/orders')).rejects.toThrow('Unauthorized');
  });

  it('handles null session gracefully', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    } as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as any);

    await apiFetch('/api/public');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/public',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer undefined',
        }),
      })
    );
  });

  it('converts snake_case response keys to camelCase', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    } as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ order_number: 'ORD/25-26/001', user_id: 'abc' }),
    } as any);

    const result = await apiFetch('/api/orders');
    expect(result).toEqual({ orderNumber: 'ORD/25-26/001', userId: 'abc' });
  });

  it('converts camelCase body keys to snake_case', async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { access_token: 'tok' } },
      error: null,
    } as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as any);

    await apiFetch('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ billingPartyName: 'ACME', containerSize: '20 ft' }),
    });

    const call = vi.mocked(global.fetch).mock.calls[0];
    const sentBody = JSON.parse(call[1]?.body as string);
    expect(sentBody).toEqual({ billing_party_name: 'ACME', container_size: '20 ft' });
  });
});

describe('keysToSnake', () => {
  it('converts camelCase keys in flat object', () => {
    expect(keysToSnake({ billingPartyName: 'X', isLolo: true }))
      .toEqual({ billing_party_name: 'X', is_lolo: true });
  });

  it('converts nested objects', () => {
    expect(keysToSnake({ vehicleId: '1', driver: { driverName: 'Ram' } }))
      .toEqual({ vehicle_id: '1', driver: { driver_name: 'Ram' } });
  });

  it('converts arrays of objects', () => {
    expect(keysToSnake([{ plateNumber: 'MH12' }]))
      .toEqual([{ plate_number: 'MH12' }]);
  });

  it('passes through non-objects unchanged', () => {
    expect(keysToSnake('hello')).toBe('hello');
    expect(keysToSnake(42)).toBe(42);
    expect(keysToSnake(null)).toBe(null);
  });
});
