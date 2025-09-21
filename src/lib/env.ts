import { z } from 'zod';

const DEFAULT_ALLOWED_DOMAINS = ['udel.edu', 'dtcc.edu'];

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  ALLOWED_DOMAINS: z.string().optional(),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
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

export function requireServiceRoleKey() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this operation');
  }
  return env.SUPABASE_SERVICE_ROLE_KEY;
}
