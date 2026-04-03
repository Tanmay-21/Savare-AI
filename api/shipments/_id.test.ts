import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

// vi.mock is hoisted — declare mocks with vi.hoisted so they're available
const { mockSupabase, mockRequireAuth } = vi.hoisted(() => {
  const mockSupabase = { from: vi.fn() };
  const mockRequireAuth = vi.fn();
  return { mockSupabase, mockRequireAuth };
});

vi.mock('../lib/supabase', () => ({ supabase: mockSupabase }));
vi.mock('../lib/auth', () => ({ requireAuth: mockRequireAuth }));

import handler, { UpdateShipmentSchema } from './_id';
import { parseBody, ApiError } from '../lib/validate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockRes() {
  const res = { status: vi.fn(), json: vi.fn(), end: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

/** Chain: from().update().eq().eq().select().single() */
function chainUpdateSingle(result: { data?: unknown; error?: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const select = vi.fn().mockReturnValue({ single });
  const eq2 = vi.fn().mockReturnValue({ select });
  const eq1 = vi.fn().mockReturnValue({ eq: eq2, select });
  const update = vi.fn().mockReturnValue({ eq: eq1 });
  return { update };
}

/** Chain: from().update().eq().eq()  — used for vehicle availability updates */
function chainVehicleUpdate(resolveWith: { error?: unknown } | 'throw') {
  if (resolveWith === 'throw') {
    const eq2 = vi.fn().mockRejectedValue(new Error('DB connection lost'));
    const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
    const update = vi.fn().mockReturnValue({ eq: eq1 });
    return { update };
  }
  const eq2 = vi.fn().mockResolvedValue(resolveWith);
  const eq1 = vi.fn().mockReturnValue({ eq: eq2 });
  const update = vi.fn().mockReturnValue({ eq: eq1 });
  return { update };
}

const SHIPMENT_ID = '123e4567-e89b-12d3-a456-426614174000';
const VEHICLE_ID  = '123e4567-e89b-12d3-a456-426614174001';
const USER_ID     = 'user-abc';

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ id: USER_ID });
});

// ---------------------------------------------------------------------------
// Schema tests (run against the real exported schema)
// ---------------------------------------------------------------------------

describe('UpdateShipmentSchema – datetime-local format acceptance', () => {
  it('accepts datetime-local format without seconds ("2026-04-03T14:30")', () => {
    const result = UpdateShipmentSchema.safeParse({ estimated_arrival: '2026-04-03T14:30' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.estimated_arrival).toBe('2026-04-03T14:30');
  });

  it('accepts full ISO 8601 with timezone ("2026-04-03T14:30:00.000Z")', () => {
    const result = UpdateShipmentSchema.safeParse({ estimated_arrival: '2026-04-03T14:30:00.000Z' });
    expect(result.success).toBe(true);
  });

  it('accepts empty string "" and transforms it to undefined', () => {
    const result = UpdateShipmentSchema.safeParse({ estimated_arrival: '' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.estimated_arrival).toBeUndefined();
  });

  it('accepts omitted estimated_arrival (undefined)', () => {
    const result = UpdateShipmentSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts actual_arrival with datetime-local format', () => {
    const result = UpdateShipmentSchema.safeParse({ actual_arrival: '2026-04-03T18:45' });
    expect(result.success).toBe(true);
  });

  it('accepts all standard fields the frontend sends together', () => {
    const payload = {
      container_number: 'MSCU1234567',
      status: 'in-transit',
      vehicle_id: VEHICLE_ID,
      vehicle_number: 'MH12AB1234',
      driver_id: '123e4567-e89b-12d3-a456-426614174001',
      driver_name: 'Raju Kumar',
      seal_number: 'SL001',
      is_locked: false,
      estimated_arrival: '2026-04-05T09:00',
      actual_arrival: '',
      remarks: 'Handle with care',
    };
    const result = UpdateShipmentSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.estimated_arrival).toBe('2026-04-05T09:00');
      expect(result.data.actual_arrival).toBeUndefined();
    }
  });

  it('rejects arbitrary non-datetime strings for estimated_arrival', () => {
    expect(UpdateShipmentSchema.safeParse({ estimated_arrival: 'not-a-date' }).success).toBe(false);
  });

  it('rejects SQL-like strings that could be injection attempts', () => {
    expect(
      UpdateShipmentSchema.safeParse({ estimated_arrival: "'; DROP TABLE shipments; --" }).success
    ).toBe(false);
  });

  it('rejects invalid status values', () => {
    expect(UpdateShipmentSchema.safeParse({ status: 'unknown-status' }).success).toBe(false);
  });

  it('rejects malformed UUID for vehicle_id', () => {
    expect(UpdateShipmentSchema.safeParse({ vehicle_id: 'not-a-uuid' }).success).toBe(false);
  });

  it('accepts null vehicle_id to unassign a vehicle', () => {
    const result = UpdateShipmentSchema.safeParse({ vehicle_id: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.vehicle_id).toBeNull();
  });

  it('accepts null driver_id to unassign a driver', () => {
    const result = UpdateShipmentSchema.safeParse({ driver_id: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.driver_id).toBeNull();
  });

  it('accepts previous_vehicle_id as UUID for atomicity handoff', () => {
    const result = UpdateShipmentSchema.safeParse({ previous_vehicle_id: VEHICLE_ID });
    expect(result.success).toBe(true);
  });

  it('accepts null previous_vehicle_id when there was no prior vehicle', () => {
    const result = UpdateShipmentSchema.safeParse({ previous_vehicle_id: null });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.previous_vehicle_id).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PATCH handler — atomicity with vehicle status
// ---------------------------------------------------------------------------

describe('shipment PATCH handler – atomicity with vehicle status', () => {
  it('schema allows in-transit without vehicle_id (handler enforces the rule)', () => {
    expect(UpdateShipmentSchema.safeParse({ status: 'in-transit' }).success).toBe(true);
  });

  it('schema allows delivered status to trigger vehicle release', () => {
    const result = UpdateShipmentSchema.safeParse({ status: 'delivered', actual_arrival: '2026-04-03T16:00' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('delivered');
      expect(result.data.actual_arrival).toBe('2026-04-03T16:00');
    }
  });

  it('schema accepts previous_vehicle_id alongside new vehicle_id for swap', () => {
    const result = UpdateShipmentSchema.safeParse({
      vehicle_id: VEHICLE_ID,
      previous_vehicle_id: '123e4567-e89b-12d3-a456-426614174005',
      status: 'in-transit',
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// PATCH handler — vehicleUpdateFailed flag (MEDIUM-4)
// ---------------------------------------------------------------------------

describe('PATCH handler – vehicleUpdateFailed signal', () => {
  const shipmentRow = {
    id: SHIPMENT_ID,
    status: 'in-transit',
    vehicle_id: VEHICLE_ID,
    user_id: USER_ID,
  };

  it('returns vehicleUpdateFailed: true when vehicle availability update throws', async () => {
    // Shipment update succeeds
    mockSupabase.from.mockReturnValueOnce(chainUpdateSingle({ data: shipmentRow, error: null }));
    // Vehicle update throws
    mockSupabase.from.mockReturnValueOnce(chainVehicleUpdate('throw'));

    const req = {
      method: 'PATCH',
      params: { id: SHIPMENT_ID },
      body: { status: 'in-transit', vehicle_id: VEHICLE_ID },
    } as unknown as Request;
    const res = mockRes();

    await handler(req, res as unknown as Response);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleUpdateFailed: true })
    );
  });

  it('returns vehicleUpdateFailed: false when vehicle update succeeds', async () => {
    mockSupabase.from.mockReturnValueOnce(chainUpdateSingle({ data: shipmentRow, error: null }));
    mockSupabase.from.mockReturnValueOnce(chainVehicleUpdate({ error: null }));

    const req = {
      method: 'PATCH',
      params: { id: SHIPMENT_ID },
      body: { status: 'in-transit', vehicle_id: VEHICLE_ID },
    } as unknown as Request;
    const res = mockRes();

    await handler(req, res as unknown as Response);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ vehicleUpdateFailed: false })
    );
  });

  it('always returns the shipment data regardless of vehicle update outcome', async () => {
    mockSupabase.from.mockReturnValueOnce(chainUpdateSingle({ data: shipmentRow, error: null }));
    mockSupabase.from.mockReturnValueOnce(chainVehicleUpdate('throw'));

    const req = {
      method: 'PATCH',
      params: { id: SHIPMENT_ID },
      body: { status: 'in-transit', vehicle_id: VEHICLE_ID },
    } as unknown as Request;
    const res = mockRes();

    await handler(req, res as unknown as Response);

    const body = res.json.mock.calls[0]?.[0];
    expect(body?.data).toEqual(shipmentRow);
  });
});

// ---------------------------------------------------------------------------
// parseBody with the real schema
// ---------------------------------------------------------------------------

describe('parseBody with UpdateShipmentSchema', () => {
  it('throws ApiError 400 for completely invalid body shape', () => {
    expect(() => parseBody(UpdateShipmentSchema, { status: 'INVALID_STATUS' })).toThrow(ApiError);
  });

  it('returns clean data for valid datetime-local input', () => {
    const result = parseBody(UpdateShipmentSchema, {
      status: 'in-transit',
      estimated_arrival: '2026-04-03T14:30',
    });
    expect(result.status).toBe('in-transit');
    expect(result.estimated_arrival).toBe('2026-04-03T14:30');
  });

  it('strips empty actual_arrival from parsed data', () => {
    const result = parseBody(UpdateShipmentSchema, { actual_arrival: '' });
    expect(result.actual_arrival).toBeUndefined();
  });

  it('throws ApiError 400 for non-datetime estimated_arrival', () => {
    expect(() => parseBody(UpdateShipmentSchema, { estimated_arrival: 'tomorrow morning' })).toThrow(ApiError);
  });
});
