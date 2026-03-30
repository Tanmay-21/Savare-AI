import { createClient } from '@supabase/supabase-js';

// Anon key is safe in browser — used ONLY for Auth (sign in/up/out)
// All data calls go through /api/* with the JWT
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL ?? '',
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''
);
