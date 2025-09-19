'use client';

import { createContext, useContext, useMemo, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';

type SupabaseContextType = SupabaseClient<Database>;

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() =>
    createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
