import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';

import { db } from '@/lib/db';
import { submissions, auditLog } from '@/lib/db/schema';
import { requireProfile } from '@/lib/auth';
import { deleteFiles, getSubmissionsBucketName } from '@/lib/storage';

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { profile } = await requireProfile();

  const database = db();

  const [submission] = await database
    .select({
      id: submissions.id,
      owner_id: submissions.owner_id,
      status: submissions.status,
      title: submissions.title,
      file_url: submissions.file_url,
      art_files: submissions.art_files,
    })
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  }

  if (submission.owner_id !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (submission.status !== 'withdrawn') {
    return NextResponse.json(
      { error: 'Only withdrawn submissions can be deleted.' },
      { status: 409 }
    );
  }

  // Best-effort storage cleanup
  const submissionsBucket = getSubmissionsBucketName();
  const filesToDelete: string[] = [];

  if (submission.file_url) {
    filesToDelete.push(submission.file_url);
  }

  const artFiles = Array.isArray(submission.art_files)
    ? (submission.art_files as unknown[]).filter((v): v is string => typeof v === 'string')
    : [];

  for (const path of artFiles) filesToDelete.push(path);

  if (filesToDelete.length > 0) {
    const { error: storageError } = await deleteFiles(submissionsBucket, filesToDelete);
    if (storageError) {
      console.error('Error deleting files from storage:', storageError);
      // Continue with DB delete even if storage deletion fails
    }
  }

  const deleteResult = await database
    .delete(submissions)
    .where(and(eq(submissions.id, id), eq(submissions.owner_id, profile.id), eq(submissions.status, 'withdrawn')))
    .returning({ id: submissions.id });

  if (!deleteResult || deleteResult.length === 0) {
    return NextResponse.json(
      { error: 'Failed to delete submission - it may not exist.' },
      { status: 400 }
    );
  }

  await database.insert(auditLog).values({
    submission_id: id,
    actor_id: profile.id,
    action: 'submission_deleted_by_owner',
    details: {
      submission_title: submission.title,
      deleted_files: filesToDelete,
    },
  });

  revalidatePath('/mine');

  return NextResponse.json({ success: true });
}

