import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq, desc, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { officerAnnouncements, profiles, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { notifyOfficersOfAnnouncement } from '@/lib/officer-notifications';
import { rateLimit, apiMutationLimiter } from '@/lib/rate-limit';

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

    // Fetch last 10 announcements
    const announcementRows = await database
      .select()
      .from(officerAnnouncements)
      .orderBy(desc(officerAnnouncements.created_at))
      .limit(10);

    if (announcementRows.length === 0) {
      return NextResponse.json({ announcements: [] });
    }

    // Fetch profiles for creators
    const createdByIds = [...new Set(announcementRows.map((a) => a.created_by))];
    const profileRows = createdByIds.length > 0
      ? await database
          .select({ id: profiles.id, name: profiles.name, full_name: profiles.full_name, email: profiles.email })
          .from(profiles)
          .where(inArray(profiles.id, createdByIds))
      : [];
    const profileMap = new Map(profileRows.map((p) => [p.id, { display_name: p.name || p.full_name || p.email, email: p.email }]));

    // Assemble the response matching the old nested shape
    const announcements = announcementRows.map((announcement) => {
      const creatorProfile = profileMap.get(announcement.created_by);
      return {
        ...announcement,
        created_by_profile: creatorProfile
          ? { display_name: creatorProfile.display_name, email: creatorProfile.email }
          : null,
      };
    });

    return NextResponse.json({ announcements });
  } catch (error) {
    console.error('Error in GET /api/officer/announcements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const profile = await ensureProfile(userId);
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rl = rateLimit(`announcements:${profile.id}`, apiMutationLimiter);
    if (!rl.success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

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
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const result = await database
      .insert(officerAnnouncements)
      .values({
        message,
        created_by: profile.id,
      })
      .returning();

    const announcement = result[0];

    // Notify other officers (fire-and-forget)
    const authorName = profile.name || profile.full_name || profile.email || 'An officer';
    notifyOfficersOfAnnouncement(message, authorName, profile.id).catch((err) =>
      console.error('[officer-email] Failed to send announcement notification:', err)
    );

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/officer/announcements:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
