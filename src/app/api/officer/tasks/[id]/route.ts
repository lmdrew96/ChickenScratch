import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { userRoles, officerTasks } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';

async function checkOfficerAccess(profileId: string) {
  const database = db();
  const userRoleResult = await database
    .select({ roles: userRoles.roles, positions: userRoles.positions })
    .from(userRoles)
    .where(eq(userRoles.user_id, profileId))
    .limit(1);

  const userRole = userRoleResult[0];
  return (
    userRole?.roles?.includes('officer') ||
    userRole?.positions?.some((p: string) =>
      ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare'].includes(p)
    )
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const profile = await ensureProfile(userId);
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!await checkOfficerAccess(profile.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to;
    if (body.status !== undefined) updates.status = body.status;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.due_date !== undefined) updates.due_date = body.due_date;

    const result = await db()
      .update(officerTasks)
      .set(updates)
      .where(eq(officerTasks.id, id))
      .returning();

    const task = result[0];
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Error in PATCH /api/officer/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const profile = await ensureProfile(userId);
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!await checkOfficerAccess(profile.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db()
      .delete(officerTasks)
      .where(eq(officerTasks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/officer/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
