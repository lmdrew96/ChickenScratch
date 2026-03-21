import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { exhibitionSubmissions, userRoles, profiles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasOfficerAccess } from '@/lib/auth/guards';
import { sendExhibitionDecisionEmail } from '@/lib/exhibition-email';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const database = db();
  const roleRows = await database
    .select({ roles: userRoles.roles, positions: userRoles.positions })
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const role = roleRows[0];
  if (!role || !hasOfficerAccess(role.positions as string[], role.roles as string[])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json() as { status: string; reviewer_notes?: string };

  if (body.status !== 'approved' && body.status !== 'declined') {
    return NextResponse.json({ error: 'Status must be "approved" or "declined".' }, { status: 400 });
  }

  try {
    const existing = await database
      .select()
      .from(exhibitionSubmissions)
      .where(eq(exhibitionSubmissions.id, id))
      .limit(1);

    if (!existing[0]) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }

    const updated = await database
      .update(exhibitionSubmissions)
      .set({
        status: body.status,
        reviewer_notes: body.reviewer_notes ?? null,
        reviewer_id: profile.id,
        reviewed_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(exhibitionSubmissions.id, id))
      .returning();

    const submission = updated[0];
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
    }

    // Fire-and-forget decision email to submitter
    const ownerRows = await database
      .select({ email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, submission.owner_id))
      .limit(1);

    const ownerEmail = ownerRows[0]?.email;
    if (ownerEmail) {
      sendExhibitionDecisionEmail({
        to: ownerEmail,
        title: submission.title,
        status: body.status as 'approved' | 'declined',
        reviewerNotes: body.reviewer_notes ?? null,
        submissionId: submission.id,
      }).catch(() => {});
    }

    return NextResponse.json({ submission });
  } catch (error) {
    console.error('[exhibition/admin/[id]] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update submission.' }, { status: 500 });
  }
}
