import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';
import { getFiscalYear } from '../../src/lib/fiscalYear';

const CreateOrderSchema = z.object({
  billing_party_name: z.string().min(1).max(200),
  consignee_name: z.string().optional(),
  is_billing_same_as_consignee: z.boolean(),
  origin: z.string().min(1),
  destination: z.string().min(1),
  container_size: z.enum(['20 ft', '40 ft']),
  movement_type: z.enum(['Import', 'Export', 'Rail']),
  is_lolo: z.boolean(),
  yard_selection: z.string().optional(),
  container_count: z.number().int().positive(),
  remarks: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAuth(req);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.json(data);
    }

    if (req.method === 'POST') {
      const body = parseBody(CreateOrderSchema, req.body);
      const fiscalYear = getFiscalYear();

      // NOTE: The counter is incremented atomically before the insert. If the insert
      // fails for any reason (validation, RLS, network), the sequence number is consumed
      // and a gap will appear in order numbers. This is intentional — gaps are acceptable
      // as they prevent deadlocks and are preferable to complex rollback logic.
      const { data: counterData, error: counterError } = await supabase.rpc('get_next_counter', {
        p_user_id: user.id,
        p_type: 'order',
        p_fiscal_year: fiscalYear,
      });
      if (counterError) throw counterError;

      const orderNumber = `ORD/${fiscalYear}/${String(counterData).padStart(3, '0')}`;

      const { data, error } = await supabase
        .from('orders')
        .insert({ ...body, user_id: user.id, order_number: orderNumber, status: 'pending' })
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
