import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function getSupabaseServerClient() {
  let c: Awaited<ReturnType<typeof cookies>> | null = null;
  try {
    c = await cookies();
  } catch {
    c = null; // outside a request (build/static) -> noop adapter
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const adapter = {
    get(name: string) {
      return c?.get(name)?.value;
    },
    set(name: string, value: string, options: any) {
      try { c?.set({ name, value, ...options }); } catch {}
    },
    remove(name: string, options: any) {
      try { c?.set({ name, value: '', ...options, maxAge: 0 }); } catch {}
    },
  };

  return createServerClient(url, key, { cookies: adapter });
}

// keep all legacy names used around the app
export const createServerSupabaseClient = getSupabaseServerClient;
export const createSupabaseServerClient = getSupabaseServerClient;
