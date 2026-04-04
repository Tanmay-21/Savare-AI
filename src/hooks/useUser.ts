import { useState, useEffect, useRef } from 'react';
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

// Module-level cache so multiple useUser() callers share one subscription
let cachedUser: AppUser | null = null;
let listeners: Array<(u: AppUser | null) => void> = [];
let initialized = false;
let initializing = false;
// Store the Supabase subscription so we can unsubscribe if needed
let authSubscription: { unsubscribe: () => void } | null = null;

function notifyListeners(u: AppUser | null) {
  cachedUser = u;
  listeners.forEach((fn) => fn(u));
}

async function fetchProfile(sessionUser: { id: string; email?: string }): Promise<void> {
  try {
    const profile = await apiFetch<AppUser>('/api/users/me');
    notifyListeners({ ...sessionUser, ...profile } as AppUser);
  } catch {
    notifyListeners({ ...sessionUser, needsProfile: true } as unknown as AppUser);
  }
}

function initSingleton() {
  if (initialized || initializing) return;
  initializing = true;

  // Initial session check
  supabase.auth.getSession().then(({ data: { session } }) => {
    initialized = true;
    initializing = false;
    if (session) {
      fetchProfile(session.user);
    } else {
      notifyListeners(null);
    }
  });

  // Auth state change listener — skip INITIAL_SESSION (handled by getSession above)
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return;
    if (session) {
      fetchProfile(session.user);
    } else {
      // On sign-out, reset singleton so next mount reinitialises cleanly
      initialized = false;
      initializing = false;
      authSubscription = null;
      subscription.unsubscribe();
      notifyListeners(null);
    }
  });
  authSubscription = subscription;
}

export function useUser() {
  const [user, setUser] = useState<AppUser | null>(cachedUser);
  const [loading, setLoading] = useState(!initialized);
  const setUserRef = useRef(setUser);
  setUserRef.current = setUser;

  useEffect(() => {
    // Register listener
    const handler = (u: AppUser | null) => {
      setUserRef.current(u);
      setLoading(false);
    };
    listeners.push(handler);

    // If already initialized, sync current value immediately
    if (initialized) {
      setUser(cachedUser);
      setLoading(false);
    } else {
      initSingleton();
    }

    return () => {
      listeners = listeners.filter((fn) => fn !== handler);
    };
  }, []);

  return { user, loading };
}
