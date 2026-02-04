import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { userRoles, meetingProposals, officerAvailability } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';

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
    const database = db();

    // Check if user has officer access
    const userRoleResult = await database
      .select({ roles: userRoles.roles, positions: userRoles.positions })
      .from(userRoles)
      .where(eq(userRoles.user_id, profile.id))
      .limit(1);

    const userRole = userRoleResult[0];
    const hasOfficerAccess =
      userRole?.roles?.includes('officer') ||
      userRole?.positions?.some((p: string) =>
        ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare'].includes(p)
      );

    if (!hasOfficerAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { finalized_date, available_slots } = body;

    // If finalizing a meeting
    if (finalized_date !== undefined) {
      const result = await database
        .update(meetingProposals)
        .set({ finalized_date })
        .where(eq(meetingProposals.id, id))
        .returning();

      const proposal = result[0];
      if (!proposal) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      }

      return NextResponse.json({ proposal });
    }

    // If updating availability
    if (available_slots !== undefined) {
      // Try to find existing availability
      const existingResult = await database
        .select({ id: officerAvailability.id })
        .from(officerAvailability)
        .where(
          and(
            eq(officerAvailability.user_id, profile.id),
            eq(officerAvailability.meeting_proposal_id, id)
          )
        )
        .limit(1);

      let availability;
      if (existingResult[0]) {
        const updateResult = await database
          .update(officerAvailability)
          .set({ available_slots })
          .where(eq(officerAvailability.id, existingResult[0].id))
          .returning();
        availability = updateResult[0];
      } else {
        const insertResult = await database
          .insert(officerAvailability)
          .values({
            user_id: profile.id,
            meeting_proposal_id: id,
            available_slots,
          })
          .returning();
        availability = insertResult[0];
      }

      return NextResponse.json({ availability });
    }

    return NextResponse.json({ error: 'No valid update provided' }, { status: 400 });
  } catch (error) {
    console.error('Error in PATCH /api/officer/meetings/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
