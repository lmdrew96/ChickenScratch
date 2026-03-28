import { NextResponse } from 'next/server';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';

// GET /api/notifications — fetch 20 most recent + unread count
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [notifRows, countRows] = await Promise.all([
    db()
      .select()
      .from(notifications)
      .where(eq(notifications.recipient_id, profile.id))
      .orderBy(desc(notifications.created_at))
      .limit(20),
    db()
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.recipient_id, profile.id), isNull(notifications.read_at))),
  ]);

  const unreadCount = Number(countRows[0]?.count ?? 0);

  return NextResponse.json({ notifications: notifRows, unreadCount });
}

// PATCH /api/notifications — mark all as read
export async function PATCH() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db()
    .update(notifications)
    .set({ read_at: new Date() })
    .where(and(eq(notifications.recipient_id, profile.id), isNull(notifications.read_at)));

  return NextResponse.json({ success: true });
}
