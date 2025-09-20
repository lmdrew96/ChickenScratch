'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

type SupabaseContextType = SupabaseClient<Database>;

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase environment variables are missing. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const [client] = useState(() =>
    createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
      },
    })
  );

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
