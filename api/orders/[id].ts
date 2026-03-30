import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';

const UpdateOrderSchema = z.object({
  status: z.enum(['pending', 'in-progress', 'completed']).optional(),
  billing_party_name: z.string().min(1).max(200).optional(),
  consignee_name: z.string().optional(),
  remarks: z.string().optional(),
});

export default async function handler(req: Request, res: Response) {
  try {
    const user = await requireAuth(req);
    const id = req.params.id;

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') throw new ApiError(404, 'Order not found');
        throw error;
      }
      return res.json(data);
    }

    if (req.method === 'PATCH') {
      const updates = parseBody(UpdateOrderSchema, req.body);
      const { data, error } = await supabase
        .from('orders')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') throw new ApiError(404, 'Order not found');
        throw error;
      }
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('orders')
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
