import { eq, gte, count } from 'drizzle-orm';
import { and } from 'drizzle-orm';

import { logHandledIssue } from '@/lib/logging';
import { db } from '@/lib/db';
import { submissions } from '@/lib/db/schema';

export class SubmissionRateLimitError extends Error {
  constructor(limit: number) {
    super(`You can only submit ${limit} pieces per hour. Please try again later.`);
    this.name = 'SubmissionRateLimitError';
  }
}

export async function enforceSubmissionRateLimit(
  userId: string,
  limit = 5
) {
  const since = new Date(Date.now() - 60 * 60 * 1000);

  try {
    const result = await db()
      .select({ count: count() })
      .from(submissions)
      .where(and(eq(submissions.owner_id, userId), gte(submissions.created_at, since)));

    const total = result[0]?.count ?? 0;

    if (total >= limit) {
      throw new SubmissionRateLimitError(limit);
    }
  } catch (error) {
    if (error instanceof SubmissionRateLimitError) throw error;

    logHandledIssue('rate-limit:submission', {
      reason: 'Failed to verify submission rate limit',
      cause: error,
      context: { userId, since: since.toISOString(), limit },
    });
    throw new Error('Could not verify submission rate limit.');
  }
}
