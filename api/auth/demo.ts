import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

// In-memory rate limiter: max 5 demo sessions per IP per hour.
// Note: module state resets on serverless cold starts — this provides
// best-effort protection within a single instance. Use Vercel Edge
// Middleware with KV storage for production-grade rate limiting.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

// Creates a real anonymous Supabase auth user for demo sessions.
// Returns a JWT — all other API endpoints work identically for demo users.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip =
    (req.headers['x-vercel-forwarded-for'] as string)?.split(',')[0].trim() ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    'unknown';

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many demo requests. Please try again later.' });
  }

  try {
    const demoEmail = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@demo.savare.app`;
    const demoPassword = crypto.randomUUID();

    // Create the user
    const { data: userData, error: createError } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: { is_demo: true },
    });

    if (createError || !userData.user) {
      throw createError ?? new Error('Failed to create demo user');
    }

    // Sign them in to get a JWT
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    });

    if (signInError || !signInData.session) {
      throw signInError ?? new Error('Failed to sign in demo user');
    }

    // Insert demo user profile
    await supabase.from('users').insert({
      auth_id: userData.user.id,
      email: demoEmail,
      role: 'Transporter',
      company_name: 'Demo Company',
      phone_number: null,
      gstin: 'DEMO000000000',
      pan: 'DEMO00000F',
      address: 'Demo Address, India',
      is_verified: true,
      is_demo: true,
    });

    return res.json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      user_id: userData.user.id,
    });
  } catch (err: any) {
    console.error('Demo auth error:', err);
    return res.status(500).json({ error: 'Failed to create demo session' });
  }
}
