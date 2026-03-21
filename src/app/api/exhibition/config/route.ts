import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { exhibitionConfig, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasOfficerAccess } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const rows = await db().select().from(exhibitionConfig);
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return NextResponse.json({ config });
  } catch (error) {
    console.error('[exhibition/config] GET error:', error);
    return NextResponse.json({ error: 'Failed to load config' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const database = db();
  const roleRows = await database
    .select({ roles: userRoles.roles, positions: userRoles.positions })
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const role = roleRows[0];
  if (!role || !hasOfficerAccess(role.positions as string[], role.roles as string[])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json() as Record<string, string>;

    for (const [key, value] of Object.entries(body)) {
      if (typeof value !== 'string') continue;

      const existing = await database
        .select({ id: exhibitionConfig.id })
        .from(exhibitionConfig)
        .where(eq(exhibitionConfig.key, key))
        .limit(1);

      if (existing.length > 0) {
        await database
          .update(exhibitionConfig)
          .set({ value, updated_at: new Date() })
          .where(eq(exhibitionConfig.key, key));
      } else {
        await database.insert(exhibitionConfig).values({ key, value });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[exhibition/config] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 });
  }
}
