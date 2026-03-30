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
