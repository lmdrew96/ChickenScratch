import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { siteConfig } from '@/lib/db/schema';
import { isAdmin } from '@/lib/actions/roles';
import { invalidateSiteConfigCache } from '@/lib/site-config';

export const dynamic = 'force-dynamic';

const ALLOWED_KEYS = [
  'officer_positions',
  'committee_positions',
  'discord_webhook_url',
  'contact_form_recipients',
  'toolkit_president_rso',
  'toolkit_president_policies',
  'toolkit_president_discord',
  'toolkit_treasurer_sio',
  'toolkit_treasurer_reimbursement',
  'toolkit_secretary_attendance',
  'toolkit_secretary_membership_db',
  'toolkit_secretary_drive',
  'toolkit_pr_canva',
  'toolkit_pr_instagram',
  'toolkit_pr_flyering',
  'toolkit_pr_linktree',
] as const;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const rows = await db().select().from(siteConfig);
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return NextResponse.json({ config });
  } catch (error) {
    console.error('[admin/site-config] GET error:', error);
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!await isAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json() as Record<string, string>;
    const database = db();

    for (const [key, value] of Object.entries(body)) {
      if (!ALLOWED_KEYS.includes(key as typeof ALLOWED_KEYS[number])) continue;
      if (typeof value !== 'string') continue;

      const existing = await database
        .select({ id: siteConfig.id })
        .from(siteConfig)
        .where(eq(siteConfig.key, key))
        .limit(1);

      if (existing.length > 0) {
        await database
          .update(siteConfig)
          .set({ value, updated_at: new Date() })
          .where(eq(siteConfig.key, key));
      } else {
        await database.insert(siteConfig).values({ key, value });
      }

      invalidateSiteConfigCache(key);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin/site-config] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
