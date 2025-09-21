'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/types/database';

function initBrowserClient(url: string, anonKey: string) {
  return createBrowserClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
    },
  });
}

type SupabaseContextType = ReturnType<typeof initBrowserClient>;

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const [client] = useState(() => initBrowserClient(supabaseUrl, supabaseAnonKey));

  const value = useMemo(() => client, [client]);

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error('Supabase client unavailable. Wrap your component with <SupabaseProvider>.');
  }
  return ctx;
}
