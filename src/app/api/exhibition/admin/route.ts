import { NextResponse } from 'next/server';
import { eq, desc, inArray } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { exhibitionSubmissions, userRoles, profiles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasOfficerAccess } from '@/lib/auth/guards';

export const dynamic = 'force-dynamic';

export async function GET() {
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
    const submissions = await database
      .select()
      .from(exhibitionSubmissions)
      .orderBy(desc(exhibitionSubmissions.created_at));

    if (submissions.length === 0) {
      return NextResponse.json({ submissions: [], owners: {} });
    }

    // Fetch owner profiles
    const ownerIds = [...new Set(submissions.map((s) => s.owner_id))];
    const ownerRows = await database
      .select({ id: profiles.id, name: profiles.name, full_name: profiles.full_name, email: profiles.email })
      .from(profiles)
      .where(inArray(profiles.id, ownerIds));

    const owners: Record<string, { name: string | null; full_name: string | null; email: string | null }> = {};
    for (const row of ownerRows) {
      owners[row.id] = { name: row.name, full_name: row.full_name, email: row.email };
    }

    return NextResponse.json({ submissions, owners });
  } catch (error) {
    console.error('[exhibition/admin] GET error:', error);
    return NextResponse.json({ error: 'Failed to load submissions.' }, { status: 500 });
  }
}
