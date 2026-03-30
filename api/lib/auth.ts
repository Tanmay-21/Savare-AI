import type { Request } from 'express';
import { supabase } from './supabase';
import { ApiError } from './validate';

export interface AuthUser {
  id: string;
  auth_id: string;
  email: string;
  role: 'CHA' | 'Transporter' | 'admin';
  company_name: string;
  phone_number: string | null;
  gstin: string;
  pan: string;
  address: string;
  cha_license_number: string | null;
  transport_license_number: string | null;
  fleet_size: '1-10' | '11-50' | '50+' | null;
  is_verified: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export async function requireAuth(req: Request): Promise<AuthUser> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new ApiError(401, 'Unauthorized');

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new ApiError(401, 'Unauthorized');

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .single();

  if (profileError || !profile) throw new ApiError(404, 'PROFILE_NOT_FOUND');
  return profile as AuthUser;
}
