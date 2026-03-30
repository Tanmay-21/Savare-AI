import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';
import { getFiscalYear } from '../../src/lib/fiscalYear';

const GenerateLRSchema = z.object({
  shipment_id: z.string().uuid(),
  order_id: z.string().uuid().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const user = await requireAuth(req);
    const { shipment_id, order_id } = parseBody(GenerateLRSchema, req.body);
    const fiscalYear = getFiscalYear();

    // Atomically get next LR sequence number
    const { data: nextNum, error: seqError } = await supabase.rpc('get_next_lr_number', {
      p_user_id: user.id,
      p_fiscal_year: fiscalYear,
    });
    if (seqError) throw seqError;

    const lrNumber = `LR/${fiscalYear}/${String(nextNum).padStart(4, '0')}`;

    // Create LR record
    const { data: lr, error: lrError } = await supabase
      .from('lrs')
      .insert({
        user_id: user.id,
        lr_number: lrNumber,
        shipment_id,
        order_id,
        fiscal_year: fiscalYear,
        sequence_number: nextNum,
      })
      .select()
      .single();

    if (lrError) throw lrError;

    // Update shipment with lr_number
    const { error: updateError } = await supabase
      .from('shipments')
      .update({ lr_number: lrNumber, updated_at: new Date().toISOString() })
      .eq('id', shipment_id)
      .eq('user_id', user.id);

    if (updateError) throw updateError;

    return res.status(201).json(lr);
  } catch (err: any) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
