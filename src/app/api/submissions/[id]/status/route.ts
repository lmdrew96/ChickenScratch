import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { submissions, auditLog, profiles, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess, hasEditorAccess } from '@/lib/auth/guards';
import { sendSubmissionEmail } from '@/lib/email';
import type { NewSubmission } from '@/types/database';

const statusSchema = z.object({
  status: z.enum(['in_review', 'needs_revision', 'accepted', 'declined']),
  editorNotes: z.string().max(4000).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status payload.' }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const database = db();

  // Check new user_roles table first
  const userRoleRows = await database
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);
  const userRoleData = userRoleRows[0];

  const hasNewRoleAccess = userRoleData?.is_member && (
    hasOfficerAccess(userRoleData.positions, userRoleData.roles) ||
    hasCommitteeAccess(userRoleData.positions, userRoleData.roles) ||
    hasEditorAccess(userRoleData.positions, userRoleData.roles)
  );

  // Fall back to legacy profile.role
  const hasLegacyAccess = profile.role === 'editor' || profile.role === 'admin';

  if (!hasNewRoleAccess && !hasLegacyAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const submissionResult = await database
    .select({
      id: submissions.id,
      title: submissions.title,
      status: submissions.status,
      owner_id: submissions.owner_id,
      editor_notes: submissions.editor_notes,
    })
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);

  const submission = submissionResult[0];

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  }

  if (parsed.data.status === 'needs_revision' && !parsed.data.editorNotes?.trim()) {
    return NextResponse.json({ error: 'Editor notes are required for revisions.' }, { status: 400 });
  }

  const updates: Partial<NewSubmission> = {
    status: parsed.data.status,
  };

  if (['accepted', 'declined', 'needs_revision'].includes(parsed.data.status)) {
    updates.decision_date = new Date();
  }

  if (parsed.data.editorNotes !== undefined) {
    updates.editor_notes = parsed.data.editorNotes;
  }

  try {
    await database
      .update(submissions)
      .set(updates)
      .where(eq(submissions.id, id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 400 });
  }

  await database.insert(auditLog).values({
    submission_id: id,
    actor_id: profile.id,
    action: 'status_change',
    details: {
      from: submission.status,
      to: parsed.data.status,
    },
  });

  const ownerResult = await database
    .select({ email: profiles.email, name: profiles.name })
    .from(profiles)
    .where(eq(profiles.id, submission.owner_id))
    .limit(1);

  const ownerProfile = ownerResult[0];
  const ownerEmail = ownerProfile?.email;

  if (ownerEmail) {
    const template = parsed.data.status === 'accepted'
      ? 'accepted'
      : parsed.data.status === 'declined'
        ? 'declined'
        : parsed.data.status === 'needs_revision'
          ? 'needs_revision'
          : null;

    if (template) {
      await sendSubmissionEmail({
        template,
        to: ownerEmail,
        submission: { id: submission.id, title: submission.title },
        editorNotes: parsed.data.editorNotes,
      });
    }
  }

  revalidatePath('/editor');
  revalidatePath('/mine');
  revalidatePath('/published');
  return NextResponse.json({ success: true });
}
