import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env, requireServiceRoleKey } from '@/lib/env';
import type { Database } from '@/types/database';

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const serviceRoleKey = requireServiceRoleKey();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
