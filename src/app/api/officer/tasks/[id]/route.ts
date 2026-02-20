import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { userRoles, officerTasks } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';

const taskUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  due_date: z.string().nullable().optional(),
});

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

    const body = await request.json().catch(() => null);
    const parsed = taskUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid update payload', details: parsed.error.errors }, { status: 400 });
    }

    const { title, description, assigned_to, status, priority, due_date } = parsed.data;
    const updates: Record<string, unknown> = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (due_date !== undefined) updates.due_date = due_date ? new Date(due_date) : null;

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
