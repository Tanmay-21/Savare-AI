import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';

const EXPENSE_CATEGORIES = [
  'Fuel', 'Toll', 'Maintenance', 'Driver Allowance',
  'Loading/Unloading', 'Permit/Tax', 'Weighment Charges', 'Other',
] as const;

const CreateExpenseSchema = z.object({
  trip_id: z.string().optional(),
  shipment_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  vehicle_number: z.string().optional(),
  driver_id: z.string().uuid().optional(),
  driver_name: z.string().optional(),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: z.number().nonnegative(),
  date: z.string().date(),
  payment_method: z.enum(['cash', 'online']),
  status: z.enum(['pending', 'paid']).default('pending'),
  payment_remark: z.string().max(1000).optional(),
  description: z.string().max(1000).optional(),
});

export const BatchExpenseSchema = z.object({
  expenses: z.array(CreateExpenseSchema).min(1),
  // When provided, the shipment is locked after all expenses are inserted.
  lock_shipment_id: z.string().uuid().optional(),
});

export default async function handler(req: Request, res: Response) {
  try {
    const user = await requireAuth(req);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      // Batch insert: body is { expenses: [...], lock_shipment_id? }
      if (Array.isArray(req.body?.expenses)) {
        const { expenses, lock_shipment_id } = parseBody(BatchExpenseSchema, req.body);

        // HIGH-1: Verify trip_id ownership — the trip must belong to this user.
        const tripId = expenses[0]?.trip_id;
        if (tripId) {
          const { data: trip, error: tripError } = await supabase
            .from('shipments')
            .select('id')
            .eq('id', tripId)
            .eq('user_id', user.id)
            .single();
          if (tripError || !trip) throw new ApiError(403, 'Trip not found or access denied');
        }

        // HIGH-2: lock_shipment_id must refer to the same trip as the expenses.
        if (lock_shipment_id && tripId && lock_shipment_id !== tripId) {
          throw new ApiError(400, 'lock_shipment_id must match the trip referenced by the expenses');
        }

        const rows = expenses.map((e) => ({ ...e, user_id: user.id }));
        const { data, error } = await supabase
          .from('expenses')
          .insert(rows)
          .select();

        if (error) throw error;

        let lockFailed = false;
        if (lock_shipment_id) {
          const { error: lockError } = await supabase
            .from('shipments')
            .update({ is_locked: true, updated_at: new Date().toISOString() })
            .eq('id', lock_shipment_id)
            .eq('user_id', user.id);

          if (lockError) {
            // Expenses are already inserted — locking is idempotent and can be retried.
            // Signal the partial failure so the client can warn the user.
            lockFailed = true;
          }
        }

        return res.status(201).json({ data, lockFailed });
      }

      // Single insert (existing behaviour)
      const body = parseBody(CreateExpenseSchema, req.body);
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...body, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return res.status(201).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
