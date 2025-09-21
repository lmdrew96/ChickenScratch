import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';
import type { Database } from '@/types/database';

let hasLoggedMutationWarning = false;

export async function createSupabaseServerReadOnlyClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies();

  return createServerClient<Database, 'public'>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: async () => cookieStore.getAll(),
        setAll: async () => {
          if (process.env.NODE_ENV !== 'production' && !hasLoggedMutationWarning) {
            hasLoggedMutationWarning = true;
            console.warn(
              'Supabase attempted to mutate cookies via the read-only helper. Ensure mutations happen in a server action or route handler instead.'
            );
          }
        },
      },
    }
  ) as unknown as SupabaseClient<Database>;
}
