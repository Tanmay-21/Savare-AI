import type { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { ApiError, parseBody } from '../lib/validate';

const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

const RegisterSchema = z.object({
  role: z.enum(['CHA', 'Transporter']),
  company_name: z.string().min(1).max(200),
  phone_number: z.string().optional(),
  gstin: z.string().regex(GSTIN_REGEX, 'Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)'),
  pan: z.string().regex(PAN_REGEX, 'Invalid PAN format (e.g. ABCDE1234F)'),
  address: z.string().min(1),
  cha_license_number: z.string().optional(),
  transport_license_number: z.string().optional(),
  fleet_size: z.enum(['1-10', '11-50', '50+']).optional(),
});

export default async function handler(req: Request, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    console.log(`[REGISTER] Token received: ${token ? '(present)' : '(missing or empty)'}`);
    
    if (!token || token === 'undefined') {
      console.error('[REGISTER] Missing or undefined auth token');
      throw new ApiError(401, 'Unauthorized');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error(`[REGISTER] Supabase auth.getUser failed:`, authError?.message || 'No user returned');
      throw new ApiError(401, 'Unauthorized');
    }

    const body = parseBody(RegisterSchema, req.body);

    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          auth_id: user.id,
          email: user.email ?? '',
          is_verified: false,
          is_demo: false,
          ...body,
        },
        { onConflict: 'auth_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return res.status(201).json(data);
  } catch (err: any) {
    if (err instanceof ApiError) return res.status(err.status).json({ error: err.message });
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
