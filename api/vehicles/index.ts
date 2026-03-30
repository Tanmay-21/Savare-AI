import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';

const CreateVehicleSchema = z.object({
  plate_number: z.string().min(1).max(20),
  vehicle_type: z.string().min(1),
  status: z.enum(['active', 'maintenance', 'inactive']).default('active'),
  is_available: z.boolean().default(true),
  insurance_expiry: z.string().date().optional(),
  permit_expiry: z.string().date().optional(),
  fitness_expiry: z.string().date().optional(),
  puc_expiry: z.string().date().optional(),
});

export default async function handler(req: Request, res: Response) {
  try {
    const user = await requireAuth(req);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      const body = parseBody(CreateVehicleSchema, req.body);
      const { data, error } = await supabase
        .from('vehicles')
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
