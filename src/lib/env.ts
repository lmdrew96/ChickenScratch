import { z } from 'zod';

const DEFAULT_ALLOWED_DOMAINS = ['udel.edu'];

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  CLERK_SECRET_KEY: z.string().min(1),
  CLERK_WEBHOOK_SECRET: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.string().url(),
  R2_PUBLIC_HOSTNAME: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  MAKE_WEBHOOK_URL: z.string().url().optional(),
  CONTACT_FORM_RECIPIENTS: z.string().optional(),
  ALLOWED_DOMAINS: z.string().optional(),
  CRON_SECRET: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
  R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
  R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
  R2_PUBLIC_HOSTNAME: process.env.R2_PUBLIC_HOSTNAME,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  MAKE_WEBHOOK_URL: process.env.MAKE_WEBHOOK_URL,
  CONTACT_FORM_RECIPIENTS: process.env.CONTACT_FORM_RECIPIENTS,
  ALLOWED_DOMAINS: process.env.ALLOWED_DOMAINS,
  CRON_SECRET: process.env.CRON_SECRET,
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
