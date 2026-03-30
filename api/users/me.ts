import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { parseBody, ApiError } from '../lib/validate';

const UpdateUserSchema = z.object({
  company_name: z.string().min(1).max(200).optional(),
  phone_number: z.string().optional(),
  address: z.string().min(1).optional(),
  fleet_size: z.enum(['1-10', '11-50', '50+']).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = await requireAuth(req);

    if (req.method === 'GET') {
      return res.json(user);
    }

    if (req.method === 'PATCH') {
      const updates = parseBody(UpdateUserSchema, req.body);
      const { data, error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return res.json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
