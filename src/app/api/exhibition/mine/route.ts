import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { exhibitionSubmissions } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const submissions = await db()
      .select()
      .from(exhibitionSubmissions)
      .where(eq(exhibitionSubmissions.owner_id, profile.id))
      .orderBy(desc(exhibitionSubmissions.created_at));

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('[exhibition/mine] GET error:', error);
    return NextResponse.json({ error: 'Failed to load submissions.' }, { status: 500 });
  }
}
