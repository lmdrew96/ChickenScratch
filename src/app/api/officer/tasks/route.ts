import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq, desc, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { officerTasks, profiles, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const profile = await ensureProfile(userId);
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const database = db();

    // Check if user has officer access
    const userRoleRows = await database
      .select({ roles: userRoles.roles, positions: userRoles.positions })
      .from(userRoles)
      .where(eq(userRoles.user_id, profile.id))
      .limit(1);

    const userRole = userRoleRows[0];
    const hasOfficerAccess =
      userRole?.roles?.includes('officer') ||
      userRole?.positions?.some((p: string) =>
        ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare'].includes(p)
      );

    if (!hasOfficerAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch all tasks
    const taskRows = await database
      .select()
      .from(officerTasks)
      .orderBy(desc(officerTasks.created_at));

    if (taskRows.length === 0) {
      return NextResponse.json({ tasks: [] });
    }

    // Collect all user IDs (assigned_to + created_by)
    const userIds = [...new Set([
      ...taskRows.map((t) => t.assigned_to).filter((id): id is string => !!id),
      ...taskRows.map((t) => t.created_by),
    ])];

    // Fetch profiles for all referenced users
    const profileRows = userIds.length > 0
      ? await database
          .select({ id: profiles.id, name: profiles.name, full_name: profiles.full_name, email: profiles.email })
          .from(profiles)
          .where(inArray(profiles.id, userIds))
      : [];
    const profileMap = new Map(profileRows.map((p) => [p.id, { display_name: p.name || p.full_name || p.email, email: p.email }]));

    // Assemble the response matching the old nested shape
    const tasks = taskRows.map((task) => {
      const assignedProfile = task.assigned_to ? profileMap.get(task.assigned_to) : null;
      const createdProfile = profileMap.get(task.created_by);

      return {
        ...task,
        assigned_to_profile: assignedProfile ? { display_name: assignedProfile.display_name, email: assignedProfile.email } : null,
        created_by_profile: createdProfile ? { display_name: createdProfile.display_name, email: createdProfile.email } : null,
      };
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Error in GET /api/officer/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const profile = await ensureProfile(userId);
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const database = db();

    // Check if user has officer access
    const userRoleRows = await database
      .select({ roles: userRoles.roles, positions: userRoles.positions })
      .from(userRoles)
      .where(eq(userRoles.user_id, profile.id))
      .limit(1);

    const userRole = userRoleRows[0];
    const hasOfficerAccess =
      userRole?.roles?.includes('officer') ||
      userRole?.positions?.some((p: string) =>
        ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare'].includes(p)
      );

    if (!hasOfficerAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, assigned_to, priority, due_date } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const result = await database
      .insert(officerTasks)
      .values({
        title,
        description,
        assigned_to,
        priority: priority || 'medium',
        due_date,
        created_by: profile.id,
        status: 'todo',
      })
      .returning();

    const task = result[0];

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/officer/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
