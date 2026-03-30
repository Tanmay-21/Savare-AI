import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';

const UpdateDriverSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  phone: z.string().optional(),
  license_number: z.string().min(1).optional(),
  status: z.enum(['available', 'on-trip', 'off-duty']).optional(),
  current_vehicle_id: z.string().uuid().nullable().optional(),
  current_vehicle_number: z.string().nullable().optional(),
  bank_account: z.string().optional(),
  ifsc: z.string().optional(),
  upi_id: z.string().optional(),
});

export default async function handler(req: Request, res: Response) {
  try {
    const user = await requireAuth(req);
    const id = req.params.id;

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw new ApiError(404, 'Driver not found');
      return res.json(data);
    }

    if (req.method === 'PATCH') {
      const updates = parseBody(UpdateDriverSchema, req.body);
      const { data, error } = await supabase
        .from('drivers')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw new ApiError(404, 'Driver not found');
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('drivers')
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
