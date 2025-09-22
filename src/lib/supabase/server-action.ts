'use server';
import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();
  const hdrs = headers();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options?: any) => {
          cookieStore.set({ name, value, ...(options || {}) });
        },
        remove: (name: string, options?: any) => {
          cookieStore.set({ name, value: '', ...(options || {}), maxAge: 0 });
        }
      },
      headers: {
        get: (name: string) => hdrs.get(name) ?? undefined
      }
    }
  );
}

export function createSupabaseServerClient() { return createClient(); }
export const createServerSupabaseClient = createSupabaseServerClient;
export default createClient;
