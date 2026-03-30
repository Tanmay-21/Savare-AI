import { createClient } from '@supabase/supabase-js';

// This file is ONLY imported in /api/* — never in src/*
// Service role key bypasses RLS and must never be exposed to the browser
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
