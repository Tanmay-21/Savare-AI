import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { apiFetch } from '../lib/api';

export interface AppUser {
  id: string;
  authId: string;
  email: string;
  role: 'CHA' | 'Transporter' | 'admin';
  companyName: string;
  phoneNumber: string | null;
  website?: string | null;
  gstin: string;
  pan: string;
  address: string;
  chaLicenseNumber: string | null;
  transportLicenseNumber: string | null;
  fleetSize: '1-10' | '11-50' | '50+' | null;
  isVerified: boolean;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  needsProfile?: boolean;
}

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        apiFetch<AppUser>('/api/users/me')
          .then((profile) => setUser({ ...session.user, ...profile } as AppUser))
          .catch(() => setUser({ ...session.user, needsProfile: true } as unknown as AppUser))
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        apiFetch<AppUser>('/api/users/me')
          .then((profile) => setUser({ ...session.user, ...profile } as AppUser))
          .catch(() => setUser({ ...session.user, needsProfile: true } as unknown as AppUser));
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
