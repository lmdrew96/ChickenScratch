import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { userRoles, officerTasks, profiles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { notifyOfficerTaskNudge } from '@/lib/officer-notifications';
import { notifyDiscordTaskNudge } from '@/lib/discord';

async function checkOfficerAccess(profileId: string) {
  const database = db();
  const result = await database
    .select({ roles: userRoles.roles, positions: userRoles.positions })
    .from(userRoles)
    .where(eq(userRoles.user_id, profileId))
    .limit(1);
  const role = result[0];
  return (
    role?.roles?.includes('officer') ||
    role?.positions?.some((p: string) =>
      ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'PR Nightmare'].includes(p)
    )
  );
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!await checkOfficerAccess(profile.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const database = db();
  const taskRows = await database
    .select()
    .from(officerTasks)
    .where(eq(officerTasks.id, id))
    .limit(1);

  const task = taskRows[0];
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });

  const nudgerName = profile.name || profile.full_name || profile.email || 'An officer';

  if (task.assigned_to) {
    // Email the assigned officer
    const assigneeRows = await database
      .select({ name: profiles.name, full_name: profiles.full_name, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, task.assigned_to))
      .limit(1);
    const assignee = assigneeRows[0];

    if (!assignee?.email) {
      return NextResponse.json({ error: 'Assignee has no email address on file.' }, { status: 422 });
    }

    await notifyOfficerTaskNudge(
      task,
      assignee.email,
      assignee.name || assignee.full_name || assignee.email,
      nudgerName,
    );

    return NextResponse.json({ success: true, channel: 'email' });
  } else {
    // No assignee — ping Discord
    await notifyDiscordTaskNudge(task, nudgerName);
    return NextResponse.json({ success: true, channel: 'discord' });
  }
}
