import { describe, expect, it } from 'vitest';

import type { SupabaseClient } from '@supabase/supabase-js';

import { SubmissionRateLimitError, enforceSubmissionRateLimit } from '../src/lib/rate-limit';
import type { Database } from '@/types/database';

type MockSupabase = {
  from: (table: string) => {
    select: (columns: string, opts: { count: 'exact'; head: boolean }) => {
      eq: (column: string, value: string) => {
        gte: (column: string, value: string) => Promise<{ count: number | null; error?: Error }>;
      };
    };
  };
};

function createMockSupabase({ count, error }: { count: number | null; error?: Error }): MockSupabase {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          gte: async () => ({ count, error }),
        }),
      }),
    }),
  };
}

describe('enforceSubmissionRateLimit', () => {
  it('allows submissions when below limit', async () => {
    const supabase = createMockSupabase({ count: 2 }) as unknown as SupabaseClient<Database>;
    await expect(enforceSubmissionRateLimit(supabase, 'user', 5)).resolves.toBeUndefined();
  });

  it('throws when limit reached', async () => {
    const supabase = createMockSupabase({ count: 5 }) as unknown as SupabaseClient<Database>;
    await expect(enforceSubmissionRateLimit(supabase, 'user', 5)).rejects.toBeInstanceOf(SubmissionRateLimitError);
  });

  it('throws when query fails', async () => {
    const supabase = createMockSupabase({
      count: null,
      error: new Error('fail'),
    }) as unknown as SupabaseClient<Database>;
    await expect(enforceSubmissionRateLimit(supabase, 'user', 5)).rejects.toThrow(
      'Could not verify submission rate limit.'
    );
  });
});
