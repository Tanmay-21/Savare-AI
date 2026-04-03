import { describe, it, expect, vi } from 'vitest';

// Mock supabase so importing index.ts does not require env vars.
vi.mock('../lib/supabase', () => ({ supabase: {} }));
vi.mock('../lib/auth', () => ({ requireAuth: vi.fn() }));

import { BatchExpenseSchema } from './index';

// Tests run against the real exported schema — not a duplicate copy.

describe('BatchExpenseSchema – batch expense submission', () => {
  it('accepts a valid array of expenses', () => {
    const payload = {
      expenses: [
        { category: 'Fuel', amount: 500, date: '2026-04-03', payment_method: 'online' },
        { category: 'Toll', amount: 150, date: '2026-04-03', payment_method: 'cash' },
      ],
    };
    const result = BatchExpenseSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expenses).toHaveLength(2);
      expect(result.data.expenses[0].status).toBe('pending'); // default applied
    }
  });

  it('accepts optional lock_shipment_id to lock shipment after insert', () => {
    const payload = {
      expenses: [
        { category: 'Fuel', amount: 500, date: '2026-04-03', payment_method: 'online' },
      ],
      lock_shipment_id: '123e4567-e89b-12d3-a456-426614174000',
    };
    const result = BatchExpenseSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.lock_shipment_id).toBe('123e4567-e89b-12d3-a456-426614174000');
    }
  });

  it('rejects empty expenses array', () => {
    expect(BatchExpenseSchema.safeParse({ expenses: [] }).success).toBe(false);
  });

  it('rejects invalid category in any expense', () => {
    const result = BatchExpenseSchema.safeParse({
      expenses: [{ category: 'InvalidCat', amount: 100, date: '2026-04-03', payment_method: 'cash' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = BatchExpenseSchema.safeParse({
      expenses: [{ category: 'Fuel', amount: -50, date: '2026-04-03', payment_method: 'online' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects malformed lock_shipment_id', () => {
    const result = BatchExpenseSchema.safeParse({
      expenses: [{ category: 'Fuel', amount: 100, date: '2026-04-03', payment_method: 'cash' }],
      lock_shipment_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('accepts zero amount (free expense is valid)', () => {
    const result = BatchExpenseSchema.safeParse({
      expenses: [{ category: 'Toll', amount: 0, date: '2026-04-03', payment_method: 'cash' }],
    });
    expect(result.success).toBe(true);
  });
});
