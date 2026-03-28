import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';

// PATCH /api/notifications/[id]/read — mark single notification as read
export async function PATCH(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await db()
    .update(notifications)
    .set({ read_at: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.recipient_id, profile.id)));

  return NextResponse.json({ success: true });
}
