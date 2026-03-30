import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';

const CreateDriverSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().optional(),
  license_number: z.string().min(1),
  status: z.enum(['available', 'on-trip', 'off-duty']).default('available'),
  current_vehicle_id: z.string().uuid().optional(),
  current_vehicle_number: z.string().optional(),
  bank_account: z.string().optional(),
  ifsc: z.string().optional(),
  upi_id: z.string().optional(),
});

export default async function handler(req: Request, res: Response) {
  try {
    const user = await requireAuth(req);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      const body = parseBody(CreateDriverSchema, req.body);
      const { data, error } = await supabase
        .from('drivers')
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
