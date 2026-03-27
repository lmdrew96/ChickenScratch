import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { siteConfig } from '@/lib/db/schema';
import { env } from '@/lib/env';

const FALLBACK_OFFICER_POSITIONS = ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'PR Nightmare'];
const FALLBACK_COMMITTEE_POSITIONS = ['Editor-in-Chief', 'Submissions Coordinator', 'Proofreader'];

// Simple TTL cache: key → { value, expiresAt }
const cache = new Map<string, { value: string | null; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

async function getSiteConfigValue(key: string): Promise<string | null> {
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  try {
    const rows = await db()
      .select({ value: siteConfig.value })
      .from(siteConfig)
      .where(eq(siteConfig.key, key))
      .limit(1);
    const value = rows[0]?.value ?? null;
    cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  } catch {
    return null;
  }
}

export function invalidateSiteConfigCache(key?: string) {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

export async function getDiscordWebhookUrl(): Promise<string | null> {
  const dbValue = await getSiteConfigValue('discord_webhook_url');
  if (dbValue && dbValue.length > 0) return dbValue;
  return env.DISCORD_WEBHOOK_URL ?? null;
}

export async function getContactFormRecipients(): Promise<string[]> {
  const dbValue = await getSiteConfigValue('contact_form_recipients');
  const raw = (dbValue && dbValue.length > 0) ? dbValue : (env.CONTACT_FORM_RECIPIENTS ?? '');
  return raw.split(',').map((e) => e.trim()).filter(Boolean);
}

export async function getOfficerPositions(): Promise<string[]> {
  const dbValue = await getSiteConfigValue('officer_positions');
  if (dbValue) {
    try {
      const parsed = JSON.parse(dbValue);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
    } catch {
      // fall through to default
    }
  }
  return FALLBACK_OFFICER_POSITIONS;
}

export async function getCommitteePositions(): Promise<string[]> {
  const dbValue = await getSiteConfigValue('committee_positions');
  if (dbValue) {
    try {
      const parsed = JSON.parse(dbValue);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
    } catch {
      // fall through to default
    }
  }
  return FALLBACK_COMMITTEE_POSITIONS;
}
