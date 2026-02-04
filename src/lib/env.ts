import { z } from 'zod';

const DEFAULT_ALLOWED_DOMAINS = ['udel.edu'];

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),
  ALLOWED_DOMAINS: z.string().optional(),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
  ALLOWED_DOMAINS: process.env.ALLOWED_DOMAINS,
});

if (!parsed.success) {
  console.error('Failed to parse environment variables', parsed.error.flatten().fieldErrors);
  throw new Error('Missing or invalid environment variables');
}

export const env = parsed.data;

export function getAllowedDomains() {
  const raw = env.ALLOWED_DOMAINS && env.ALLOWED_DOMAINS.trim().length > 0
    ? env.ALLOWED_DOMAINS
    : DEFAULT_ALLOWED_DOMAINS.join(',');

  return raw
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}
