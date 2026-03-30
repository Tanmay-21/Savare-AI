import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';

const UpdateShipmentSchema = z.object({
  container_number: z.string().optional(),
  status: z.enum(['pending', 'in-transit', 'delivered', 'cancelled']).optional(),
  vehicle_id: z.string().uuid().optional(),
  vehicle_number: z.string().optional(),
  driver_id: z.string().uuid().optional(),
  driver_name: z.string().optional(),
  lr_number: z.string().optional(),
  seal_number: z.string().optional(),
  is_locked: z.boolean().optional(),
  estimated_arrival: z.string().datetime().optional(),
  actual_arrival: z.string().datetime().optional(),
  remarks: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAuth(req);
    const { id } = req.query as { id: string };

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') throw new ApiError(404, 'Shipment not found');
        throw error;
      }
      return res.json(data);
    }

    if (req.method === 'PATCH') {
      const updates = parseBody(UpdateShipmentSchema, req.body);
      const { data, error } = await supabase
        .from('shipments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') throw new ApiError(404, 'Shipment not found');
        throw error;
      }
      return res.json(data);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('shipments')
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
