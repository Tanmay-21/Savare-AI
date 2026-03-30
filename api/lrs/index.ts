import type { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { requireAuth } from '../lib/auth';
import { ApiError } from '../lib/validate';

export default async function handler(req: Request, res: Response) {
  try {
    const user = await requireAuth(req);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('lrs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

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
