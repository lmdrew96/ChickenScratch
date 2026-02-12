import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { submissions, auditLog, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { getSubmissionsBucketName, deleteFiles } from '@/lib/storage';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  // Authenticate user
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const database = db();

  // Check if user has admin permissions (BBEG or Dictator-in-Chief)
  const userRoleResult = await database
    .select({ positions: userRoles.positions })
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const userRole = userRoleResult[0];

  const isAdmin =
    userRole?.positions?.includes('BBEG') ||
    userRole?.positions?.includes('Dictator-in-Chief');

  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Forbidden: Only BBEG or Dictator-in-Chief can delete submissions' },
      { status: 403 }
    );
  }

  // Fetch submission details
  const submissionResult = await database
    .select({
      id: submissions.id,
      title: submissions.title,
      owner_id: submissions.owner_id,
      file_url: submissions.file_url,
      google_docs_link: submissions.google_docs_link,
    })
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);

  const submission = submissionResult[0];

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const submissionsBucket = getSubmissionsBucketName();

  // Delete associated files from storage
  const filesToDelete: string[] = [];

  if (submission.file_url) {
    // file_url is a relative path; handle legacy full URLs too
    let filePath = submission.file_url;
    try {
      const url = new URL(submission.file_url);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/submissions\/(.+)/);
      if (pathMatch && pathMatch[1]) {
        filePath = pathMatch[1];
      }
    } catch {
      // Not a URL, use as-is (relative path)
    }
    filesToDelete.push(filePath);
  }

  // Delete files from storage
  if (filesToDelete.length > 0) {
    const { error: storageError } = await deleteFiles(submissionsBucket, filesToDelete);

    if (storageError) {
      console.error('Error deleting files from storage:', storageError);
      // Continue with deletion even if storage deletion fails
    }
  }

  // Delete the submission record from database first
  const deleteResult = await database
    .delete(submissions)
    .where(eq(submissions.id, id))
    .returning();

  if (!deleteResult || deleteResult.length === 0) {
    return NextResponse.json(
      { error: 'Failed to delete submission - it may not exist' },
      { status: 400 }
    );
  }

  // Log the deletion action for audit trail after successful delete
  await database.insert(auditLog).values({
    submission_id: id,
    actor_id: profile.id,
    action: 'submission_deleted',
    details: {
      submission_title: submission.title,
      submission_owner_id: submission.owner_id,
      deleted_files: filesToDelete,
      google_docs_link: submission.google_docs_link,
    },
  });

  // Revalidate relevant pages
  revalidatePath('/editor');
  revalidatePath('/committee');
  revalidatePath('/mine');
  revalidatePath('/published');

  return NextResponse.json({
    success: true,
    message: 'Submission deleted successfully',
    deleted: {
      submission_id: id,
      title: submission.title,
      files_deleted: filesToDelete.length,
    },
  });
}
