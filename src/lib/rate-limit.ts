import { eq, gte, count } from 'drizzle-orm';
import { and } from 'drizzle-orm';
import type { NextRequest } from 'next/server';

import { logHandledIssue } from '@/lib/logging';
import { db } from '@/lib/db';
import { submissions } from '@/lib/db/schema';

// ---------------------------------------------------------------------------
// General-purpose in-memory rate limiter (sliding window)
// ---------------------------------------------------------------------------

type RateLimitEntry = { count: number; resetTime: number };

type RateLimitConfig = { windowMs: number; max: number };

const store = new Map<string, RateLimitEntry>();

// Clean expired entries every 5 minutes to prevent memory leaks
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetTime) {
      store.delete(key);
    }
  }
}

export function rateLimit(
  key: string,
  config: RateLimitConfig,
): { success: boolean; remaining: number; retryAfterMs: number } {
  cleanupExpiredEntries();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now >= entry.resetTime) {
    store.set(key, { count: 1, resetTime: now + config.windowMs });
    return { success: true, remaining: config.max - 1, retryAfterMs: 0 };
  }

  entry.count += 1;

  if (entry.count > config.max) {
    const retryAfterMs = entry.resetTime - now;
    return { success: false, remaining: 0, retryAfterMs };
  }

  return { success: true, remaining: config.max - entry.count, retryAfterMs: 0 };
}

// Pre-configured limiters
export const contactFormLimiter: RateLimitConfig = { windowMs: 60 * 60 * 1000, max: 5 };    // 5/hour per IP
export const apiMutationLimiter: RateLimitConfig = { windowMs: 60 * 1000, max: 30 };         // 30/min per user

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

// ---------------------------------------------------------------------------
// Submission-specific rate limit (database-backed)
// ---------------------------------------------------------------------------

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
