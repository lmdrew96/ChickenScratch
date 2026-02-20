import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq, desc, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { meetingProposals, officerAvailability, profiles, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { notifyOfficersOfMeeting } from '@/lib/officer-notifications';

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

    // Fetch all meeting proposals
    const proposalRows = await database
      .select()
      .from(meetingProposals)
      .orderBy(desc(meetingProposals.created_at));

    if (proposalRows.length === 0) {
      return NextResponse.json({ proposals: [] });
    }

    // Collect all created_by IDs and proposal IDs
    const createdByIds = [...new Set(proposalRows.map((p) => p.created_by))];
    const proposalIds = proposalRows.map((p) => p.id);

    // Fetch profiles for proposal creators
    const creatorProfiles = createdByIds.length > 0
      ? await database
          .select({ id: profiles.id, name: profiles.name, full_name: profiles.full_name, email: profiles.email })
          .from(profiles)
          .where(inArray(profiles.id, createdByIds))
      : [];
    const creatorMap = new Map(creatorProfiles.map((p) => [p.id, { display_name: p.name || p.full_name || p.email, email: p.email }]));

    // Fetch all availability for these proposals
    const availabilityRows = await database
      .select()
      .from(officerAvailability)
      .where(inArray(officerAvailability.meeting_proposal_id, proposalIds));

    // Fetch profiles for availability users
    const availUserIds = [...new Set(availabilityRows.map((a) => a.user_id))];
    const availProfiles = availUserIds.length > 0
      ? await database
          .select({ id: profiles.id, name: profiles.name, full_name: profiles.full_name, email: profiles.email })
          .from(profiles)
          .where(inArray(profiles.id, availUserIds))
      : [];
    const availProfileMap = new Map(availProfiles.map((p) => [p.id, { display_name: p.name || p.full_name || p.email, email: p.email }]));

    // Group availability by proposal
    const availabilityByProposal = new Map<string, typeof availabilityRows>();
    for (const avail of availabilityRows) {
      const existing = availabilityByProposal.get(avail.meeting_proposal_id) || [];
      existing.push(avail);
      availabilityByProposal.set(avail.meeting_proposal_id, existing);
    }

    // Assemble the response matching the old nested shape
    const proposals = proposalRows.map((proposal) => {
      const creator = creatorMap.get(proposal.created_by);
      const avails = availabilityByProposal.get(proposal.id) || [];

      return {
        ...proposal,
        created_by_profile: creator ? { display_name: creator.display_name, email: creator.email } : null,
        officer_availability: avails.map((a) => {
          const userProf = availProfileMap.get(a.user_id);
          return {
            id: a.id,
            user_id: a.user_id,
            available_slots: a.available_slots,
            user_profile: userProf ? { display_name: userProf.display_name, email: userProf.email } : null,
          };
        }),
      };
    });

    return NextResponse.json({ proposals });
  } catch (error) {
    console.error('Error in GET /api/officer/meetings:', error);
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
    const { title, description, proposed_dates } = body;

    if (!title || !proposed_dates || !Array.isArray(proposed_dates) || proposed_dates.length === 0) {
      return NextResponse.json({ error: 'Title and proposed dates are required' }, { status: 400 });
    }

    const result = await database
      .insert(meetingProposals)
      .values({
        title,
        description,
        proposed_dates,
        created_by: profile.id,
      })
      .returning();

    const proposal = result[0];

    // Notify other officers (fire-and-forget)
    const authorName = profile.name || profile.full_name || profile.email || 'An officer';
    notifyOfficersOfMeeting(title, description || null, proposed_dates, authorName, profile.id).catch((err) =>
      console.error('[officer-email] Failed to send meeting notification:', err)
    );

    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/officer/meetings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
