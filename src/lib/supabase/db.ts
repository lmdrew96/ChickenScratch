import { createSupabaseAdminClient } from './admin';

/**
 * Returns a Supabase client using the service role key.
 * All server-side DB access goes through this after migrating to Clerk auth.
 */
export function db() {
  return createSupabaseAdminClient();
}
