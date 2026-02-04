import { describe, expect, it, vi } from 'vitest';

import { SubmissionRateLimitError, enforceSubmissionRateLimit } from '../src/lib/rate-limit';

// Mock the db module
vi.mock('../src/lib/db', () => ({
  db: () => ({
    select: () => ({
      from: () => ({
        where: async () => [{ count: mockCount }],
      }),
    }),
  }),
}));

let mockCount = 0;

describe('enforceSubmissionRateLimit', () => {
  it('allows submissions when below limit', async () => {
    mockCount = 2;
    await expect(enforceSubmissionRateLimit('user', 5)).resolves.toBeUndefined();
  });

  it('throws when limit reached', async () => {
    mockCount = 5;
    await expect(enforceSubmissionRateLimit('user', 5)).rejects.toBeInstanceOf(SubmissionRateLimitError);
  });

  it('throws when limit exceeded', async () => {
    mockCount = 10;
    await expect(enforceSubmissionRateLimit('user', 5)).rejects.toBeInstanceOf(SubmissionRateLimitError);
  });
});
