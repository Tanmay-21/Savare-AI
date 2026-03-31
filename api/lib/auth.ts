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

  // If no rows returned (PGRST116), auto-create a placeholder profile
  if (profileError?.code === 'PGRST116' || !profile) {
    console.log(`[Auth] Auto-creating missing profile for auth_id: ${user.id}`);
    
    const { data: newProfile, error: insertError } = await supabase
      .from('users')
      .insert({
        auth_id: user.id,
        email: user.email ?? '',
        role: 'Transporter',
        company_name: 'Pending Setup',
        gstin: '22AAAAA0000A1Z5', // Must match valid format constraints
        pan: 'ABCDE1234F',
        address: 'Please update your address',
        is_verified: false,
        is_demo: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[Auth] Failed to auto-create profile:', insertError);
      throw new ApiError(500, 'INTERNAL_PROFILE_CREATE_ERROR');
    }
    return newProfile as AuthUser;
  }

  if (profileError) {
    console.error(`[Auth] Profile fetch error:`, profileError);
    throw new ApiError(500, 'DATABASE_ERROR');
  }
  
  return profile as AuthUser;
}
