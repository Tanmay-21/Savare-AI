import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// vi.mock is hoisted — declare mocks with vi.hoisted so they're available
const { mockSupabase, mockRequireAuth } = vi.hoisted(() => {
  const mockSupabase = { from: vi.fn(), rpc: vi.fn() };
  const mockRequireAuth = vi.fn();
  return { mockSupabase, mockRequireAuth };
});

vi.mock('../lib/supabase', () => ({ supabase: mockSupabase }));
vi.mock('../lib/auth', () => ({ requireAuth: mockRequireAuth }));
vi.mock('../../src/lib/fiscalYear', () => ({ getFiscalYear: () => '25-26' }));

import handler, { GenerateLRSchema } from './generate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a chainable mock that resolves to `result` at `.single()`. */
function chainSingle(result: { data?: unknown; error?: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const eq2 = vi.fn().mockReturnValue({ single });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2, single });
  const select = vi.fn().mockReturnValue({ eq: eq1 });
  return { select, eq: eq1, single };
}

function mockRes() {
  const res = { status: vi.fn(), json: vi.fn(), end: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ id: 'user-123' });
});

// ---------------------------------------------------------------------------
// Schema tests
// ---------------------------------------------------------------------------

describe('GenerateLRSchema', () => {
  it('requires shipment_id as a valid UUID', () => {
    expect(GenerateLRSchema.safeParse({ shipment_id: 'not-a-uuid' }).success).toBe(false);
    expect(GenerateLRSchema.safeParse({ shipment_id: '123e4567-e89b-12d3-a456-426614174000' }).success).toBe(true);
  });

  it('accepts optional order_id', () => {
    const r = GenerateLRSchema.safeParse({
      shipment_id: '123e4567-e89b-12d3-a456-426614174000',
      order_id: '123e4567-e89b-12d3-a456-426614174001',
    });
    expect(r.success).toBe(true);
  });

  it('rejects missing shipment_id', () => {
    expect(GenerateLRSchema.safeParse({}).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Handler – status guard
// ---------------------------------------------------------------------------

describe('POST /api/lrs/generate – shipment status guard', () => {
  const shipmentId = '123e4567-e89b-12d3-a456-426614174000';
  const validBody = { shipment_id: shipmentId };

  it('returns 400 when shipment status is "pending"', async () => {
    mockSupabase.from.mockReturnValueOnce(
      chainSingle({ data: { status: 'pending' }, error: null })
    );
    const res = mockRes();
    await handler({ method: 'POST', body: validBody } as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0]?.[0];
    expect(body?.error).toMatch(/delivered/i);
    expect(body?.error).toMatch(/pending/i);
  });

  it('returns 400 when shipment status is "in-transit"', async () => {
    mockSupabase.from.mockReturnValueOnce(
      chainSingle({ data: { status: 'in-transit' }, error: null })
    );
    const res = mockRes();
    await handler({ method: 'POST', body: validBody } as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0]?.[0];
    expect(body?.error).toMatch(/delivered/i);
    expect(body?.error).toMatch(/in-transit/i);
  });

  it('returns 400 when shipment status is "cancelled"', async () => {
    mockSupabase.from.mockReturnValueOnce(
      chainSingle({ data: { status: 'cancelled' }, error: null })
    );
    const res = mockRes();
    await handler({ method: 'POST', body: validBody } as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0]?.[0]?.error).toMatch(/delivered/i);
  });

  it('returns 404 when shipment does not exist', async () => {
    mockSupabase.from.mockReturnValueOnce(
      chainSingle({ data: null, error: { code: 'PGRST116' } })
    );
    const res = mockRes();
    await handler({ method: 'POST', body: validBody } as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('proceeds to 201 when shipment is "delivered"', async () => {
    const lrRecord = { id: 'lr-1', lr_number: 'LR/25-26/0001' };

    // 1. shipment status lookup
    mockSupabase.from.mockReturnValueOnce(
      chainSingle({ data: { status: 'delivered' }, error: null })
    );
    // 2. get_next_lr_number RPC
    mockSupabase.rpc.mockResolvedValueOnce({ data: 1, error: null });
    // 3. insert LR record
    mockSupabase.from.mockReturnValueOnce({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: lrRecord, error: null }),
        }),
      }),
    });
    // 4. update shipment with lr_number
    mockSupabase.from.mockReturnValueOnce({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const res = mockRes();
    await handler({ method: 'POST', body: validBody } as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(lrRecord);
  });

  it('returns 405 for non-POST methods', async () => {
    const res = mockRes();
    await handler({ method: 'GET', body: {} } as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(405);
  });
});
