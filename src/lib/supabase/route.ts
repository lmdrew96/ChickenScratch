import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import type { Database } from '@/types/database';
import { assertMutableCookies, type MutableCookies } from '@/lib/supabase/cookies';

export async function createSupabaseRouteHandlerClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();
  assertMutableCookies(cookieStore, 'Route Handler');
  const mutableCookies = cookieStore as MutableCookies;

  return createServerClient<Database, 'public'>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: async () => mutableCookies.getAll(),
        setAll: async (cookieList) => {
          for (const { name, value, options } of cookieList) {
            mutableCookies.set({ name, value, ...(options ?? {}) });
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>;
}
