import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Canonical getter */
export function getSupabaseServerClient() {
  const store = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return store.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        store.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        store.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });
}

/** Back-compat aliases so all import styles work */
export const createServerSupabaseClient = getSupabaseServerClient;
/** This is the one your code is importing in errors */
export const createSupabaseServerClient = getSupabaseServerClient;
