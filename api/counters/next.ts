import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';
import { getFiscalYear } from '../../src/lib/fiscalYear';

const CounterSchema = z.object({
  type: z.enum(['order', 'trip']),
});

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const user = await requireAuth(req);
    const { type } = parseBody(CounterSchema, req.body);
    const fiscalYear = getFiscalYear();
    const prefix = type === 'order' ? 'ORD' : 'TRP';

    const { data, error } = await supabase.rpc('get_next_counter', {
      p_user_id: user.id,
      p_type: type,
      p_fiscal_year: fiscalYear,
    });

    if (error) throw error;

    const id = `${prefix}/${fiscalYear}/${String(data).padStart(3, '0')}`;
    return res.json({ id, number: data, fiscalYear });
  } catch (err: any) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
