import type { CookieOptions } from '@supabase/ssr';

export type MutableCookies = {
  getAll: () => Array<{ name: string; value: string }>;
  set: (options: { name: string; value: string } & CookieOptions) => void;
};

type MaybeMutableCookies = {
  getAll?: () => Array<{ name: string; value: string }>;
  set?: (options: { name: string; value: string } & CookieOptions) => void;
};

export function assertMutableCookies(
  cookieStore: MaybeMutableCookies,
  context: 'Server Action' | 'Route Handler'
): asserts cookieStore is MutableCookies {
  if (typeof cookieStore?.set !== 'function') {
    throw new Error(
      `createSupabase${context.replace(' ', '')}Client can only be used within a ${context}. ` +
        'Use createSupabaseServerReadOnlyClient for Server Components.'
    );
  }
}
