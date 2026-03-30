import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';

const UpdateVehicleSchema = z.object({
  plate_number: z.string().min(1).max(20).optional(),
  vehicle_type: z.string().min(1).optional(),
  status: z.enum(['active', 'maintenance', 'inactive']).optional(),
  is_available: z.boolean().optional(),
  current_driver_id: z.string().uuid().nullable().optional(),
  insurance_expiry: z.string().date().optional(),
  permit_expiry: z.string().date().optional(),
  fitness_expiry: z.string().date().optional(),
  puc_expiry: z.string().date().optional(),
});

export default async function handler(req: Request, res: Response) {
  try {
    const user = await requireAuth(req);
    const id = req.params.id;

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw new ApiError(404, 'Vehicle not found');
      return res.json(data);
    }

    if (req.method === 'PATCH') {
      const updates = parseBody(UpdateVehicleSchema, req.body);
      const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw new ApiError(404, 'Vehicle not found');
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('vehicles')
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
