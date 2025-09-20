import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import type { Database } from '@/types/database';

export async function createSupabaseServerClient(): Promise<SupabaseClient<Database>> {
  return createServerClient<Database, 'public'>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: async () => {
          const store = await cookies();
          return store.getAll();
        },
        setAll: async (cookieList) => {
          const store = await cookies();
          if (typeof (store as unknown as { set?: unknown }).set !== 'function') {
            console.warn('Attempted to set cookies in a read-only context.');
            return;
          }
          for (const { name, value, options } of cookieList) {
            try {
              (store as unknown as { set: (options: { name: string; value: string } & CookieOptions) => void }).set({
                name,
                value,
                ...options,
              });
            } catch (error) {
              console.warn('Unable to set cookie on server', error);
            }
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>;
}
