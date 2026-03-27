import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { submissions, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasEditorAccess, hasOfficerAccess } from '@/lib/auth/guards';
import { rateLimit, apiMutationLimiter } from '@/lib/rate-limit';

type ArtFileStatus = 'pending' | 'approved' | 'declined';

// PATCH /api/submissions/[id]/art-files
// Body: { filePath: string; status: ArtFileStatus }
// Sets the approval status of a single art file within a visual submission.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = rateLimit(`art-file-status:${profile.id}`, apiMutationLimiter);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  // Require committee/editor/officer access
  const database = db();
  const userRoleRows = await database
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);
  const userRoleData = userRoleRows[0];

  const hasAccess = userRoleData?.is_member && (
    hasOfficerAccess(userRoleData.positions, userRoleData.roles) ||
    hasCommitteeAccess(userRoleData.positions, userRoleData.roles) ||
    hasEditorAccess(userRoleData.positions, userRoleData.roles)
  );

  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  let body: { filePath?: string; status?: ArtFileStatus };
  try {
    body = await request.json() as { filePath?: string; status?: ArtFileStatus };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { filePath, status } = body;

  if (!filePath || typeof filePath !== 'string') {
    return NextResponse.json({ error: 'filePath is required.' }, { status: 400 });
  }
  if (status !== 'pending' && status !== 'approved' && status !== 'declined') {
    return NextResponse.json({ error: 'status must be pending, approved, or declined.' }, { status: 400 });
  }

  // Fetch the submission to validate it exists and is visual
  const rows = await database
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  const submission = rows[0];

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  }
  if (submission.type !== 'visual') {
    return NextResponse.json({ error: 'Only visual submissions have art files.' }, { status: 400 });
  }

  const artFiles = Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [];
  if (!artFiles.includes(filePath)) {
    return NextResponse.json({ error: 'File path not found in this submission.' }, { status: 400 });
  }

  const currentStatuses = (
    submission.art_file_statuses && typeof submission.art_file_statuses === 'object' && !Array.isArray(submission.art_file_statuses)
      ? submission.art_file_statuses
      : {}
  ) as Record<string, ArtFileStatus>;

  const updatedStatuses = { ...currentStatuses, [filePath]: status };

  await database
    .update(submissions)
    .set({ art_file_statuses: updatedStatuses })
    .where(eq(submissions.id, id));

  return NextResponse.json({ success: true, art_file_statuses: updatedStatuses });
}
