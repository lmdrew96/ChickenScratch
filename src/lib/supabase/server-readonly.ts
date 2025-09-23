
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function createSupabaseServerReadOnlyClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
  }

  // Next.js 15+ requires awaiting cookies()
  const cookieStore = await cookies();

  const supabase = createServerClient(url, anon, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      // read-only client: ignore writes on the server path
      set: () => {},
      remove: () => {},
    },
  });

  return supabase;
}
