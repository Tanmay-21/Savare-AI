import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';
import { getFiscalYear } from '../../src/lib/fiscalYear';

const CreateShipmentSchema = z.object({
  order_id: z.string().uuid().optional(),
  container_number: z.string().optional().default(''),
  container_size: z.enum(['20 ft', '40 ft']).optional(),
  origin: z.string().min(1),
  destination: z.string().min(1),
  vehicle_id: z.string().uuid().optional(),
  vehicle_number: z.string().optional(),
  driver_id: z.string().uuid().optional(),
  driver_name: z.string().optional(),
  movement_type: z.enum(['Import', 'Export', 'Rail']).optional(),
  is_lolo: z.boolean().optional(),
  yard_selection: z.string().optional(),
  billing_party_name: z.string().optional(),
  consignee_name: z.string().optional(),
  is_billing_same_as_consignee: z.boolean().optional(),
  remarks: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAuth(req);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      const body = parseBody(CreateShipmentSchema, req.body);
      const fiscalYear = getFiscalYear();

      // NOTE: Counter is incremented before insert. If the insert fails, the sequence
      // number is consumed and a gap appears in trip IDs. Gaps are intentional.
      const { data: tripCounter, error: counterError } = await supabase.rpc('get_next_counter', {
        p_user_id: user.id,
        p_type: 'trip',
        p_fiscal_year: fiscalYear,
      });
      if (counterError) throw counterError;

      const tripId = `TRP/${fiscalYear}/${String(tripCounter).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('shipments')
        .insert({ ...body, user_id: user.id, trip_id: tripId, status: 'pending' })
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
