'use server';

import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { submissions, profiles } from '@/lib/db/schema';
import { uploadFile, getSubmissionsBucketName, getBucketName } from '@/lib/storage';
import type { NewSubmission } from '@/types/database';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export async function reviseSubmission(
  submissionId: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const database = db();

  // Look up the profile
  const profileRows = await database
    .select({ id: profiles.id })
    .from(profiles)
    .where(eq(profiles.clerk_id, userId))
    .limit(1);

  const profile = profileRows[0];
  if (!profile) return { success: false, error: 'Not authenticated' };

  // Fetch the submission
  const rows = await database
    .select({
      id: submissions.id,
      owner_id: submissions.owner_id,
      status: submissions.status,
      type: submissions.type,
    })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  const submission = rows[0];
  if (!submission) return { success: false, error: 'Submission not found' };

  if (submission.owner_id !== profile.id) {
    return { success: false, error: 'Forbidden' };
  }

  if (submission.status !== 'needs_revision') {
    return { success: false, error: 'This submission is not open for revision.' };
  }

  const title = formData.get('title')?.toString()?.trim();
  const preferredName = formData.get('preferredName')?.toString()?.trim();
  const file = formData.get('file') as File | null;

  const updates: Partial<NewSubmission> = {};

  if (title && title.length >= 3 && title.length <= 200) {
    updates.title = title;
  }

  if (preferredName !== undefined) {
    updates.preferred_name = preferredName || null;
  }

  // Handle file re-upload
  if (file && file.size > 0) {
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, error: 'File must be less than 10 MB.' };
    }

    const bucket = submission.type === 'writing' ? getSubmissionsBucketName() : getBucketName();
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${profile.id}/${timestamp}-${sanitizedFileName}`;

    const { path: uploadedPath, error: uploadError } = await uploadFile(bucket, filePath, file);

    if (uploadError || !uploadedPath) {
      return { success: false, error: 'Failed to upload file. Please try again.' };
    }

    updates.file_url = uploadedPath;
    updates.file_name = file.name;
    updates.file_type = file.type;
    updates.file_size = file.size;

    if (submission.type === 'visual') {
      updates.cover_image = uploadedPath;
      updates.art_files = [uploadedPath];
    }
  }

  // Move back to submitted so the committee can re-review
  updates.status = 'submitted';
  updates.committee_status = 'pending_coordinator';
  updates.updated_at = new Date();

  await database
    .update(submissions)
    .set(updates)
    .where(eq(submissions.id, submissionId));

  revalidatePath('/mine');
  revalidatePath('/committee');

  return { success: true };
}
