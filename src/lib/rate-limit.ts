import type { SupabaseClient } from '@supabase/supabase-js';

import { logHandledIssue } from '@/lib/logging';
import type { Database } from '@/types/database';

export class SubmissionRateLimitError extends Error {
  constructor(limit: number) {
    super(`You can only submit ${limit} pieces per hour. Please try again later.`);
    this.name = 'SubmissionRateLimitError';
  }
}

export async function enforceSubmissionRateLimit(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 5
) {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { error, count } = await supabase
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', userId)
    .gte('created_at', since);

  if (error) {
    logHandledIssue('rate-limit:submission', {
      reason: 'Failed to verify submission rate limit',
      cause: error,
      context: { userId, since, limit },
    });
    throw new Error('Could not verify submission rate limit.');
  }

  if ((count ?? 0) >= limit) {
    throw new SubmissionRateLimitError(limit);
  }
}
