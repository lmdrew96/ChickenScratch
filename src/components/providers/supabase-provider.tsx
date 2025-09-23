'use client';
import React, { createContext, useContext, useMemo } from 'react';
import getSupabaseBrowserClient from '@/lib/supabase/client';

type Supabase = ReturnType<typeof getSupabaseBrowserClient>;
const SupabaseContext = createContext<Supabase | null>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  return <SupabaseContext.Provider value={supabase}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error('Supabase client unavailable. Wrap your component with <SupabaseProvider>.');
  return ctx;
}
export default SupabaseProvider;
