import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';

const EXPENSE_CATEGORIES = [
  'Fuel', 'Toll', 'Maintenance', 'Driver Allowance',
  'Loading/Unloading', 'Permit/Tax', 'Weighment Charges', 'Other',
] as const;

const UpdateExpenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  amount: z.number().nonnegative().optional(),
  date: z.string().date().optional(),
  payment_method: z.enum(['cash', 'online']).optional(),
  status: z.enum(['pending', 'paid']).optional(),
  payment_remark: z.string().max(1000).optional(),
  description: z.string().max(1000).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAuth(req);
    const { id } = req.query as { id: string };

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw new ApiError(404, 'Expense not found');
      return res.json(data);
    }

    if (req.method === 'PATCH') {
      const updates = parseBody(UpdateExpenseSchema, req.body);
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw new ApiError(404, 'Expense not found');
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
