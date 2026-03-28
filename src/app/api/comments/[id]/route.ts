import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { comments } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { getUserRole } from '@/lib/actions/roles';
import { hasOfficerAccess } from '@/lib/auth/guards';

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await ensureProfile(clerkId);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 401 });

  const [comment] = await db()
    .select({ id: comments.id, author_id: comments.author_id })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);

  if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

  const role = await getUserRole(profile.id);
  const isOfficer = hasOfficerAccess(role.positions as string[], role.roles as string[]);

  if (comment.author_id !== profile.id && !isOfficer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await db().delete(comments).where(eq(comments.id, id));
  return NextResponse.json({ success: true });
}
