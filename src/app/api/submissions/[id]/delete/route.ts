import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/supabase/db';
import { ensureProfile } from '@/lib/auth/clerk';
import { getSubmissionsBucketName } from '@/lib/storage';
import type { Database, Submission } from '@/types/database';

type UserRole = Database['public']['Tables']['user_roles']['Row'];

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
  const supabase = db();

  // Check if user has admin permissions (BBEG or Dictator-in-Chief)
  const { data: userRoleData } = await supabase
    .from('user_roles')
    .select('positions')
    .eq('user_id', profile.id)
    .maybeSingle();

  const userRole = userRoleData as Pick<UserRole, 'positions'> | null;

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
  const { data: submissionData, error: fetchError } = await supabase
    .from('submissions')
    .select('id, title, owner_id, file_url, google_docs_link')
    .eq('id', id)
    .maybeSingle();

  const submission = submissionData as Pick<
    Submission,
    'id' | 'title' | 'owner_id' | 'file_url' | 'google_docs_link'
  > | null;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  // Use db() (service role) for storage operations
  const submissionsBucket = getSubmissionsBucketName();

  // Delete associated files from storage
  const filesToDelete: string[] = [];

  if (submission.file_url) {
    // Extract path from file_url
    // file_url format: https://{project}.supabase.co/storage/v1/object/public/submissions/{path}
    try {
      const url = new URL(submission.file_url);
      const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/submissions\/(.+)/);
      if (pathMatch && pathMatch[1]) {
        filesToDelete.push(pathMatch[1]);
      }
    } catch (error) {
      console.error('Error parsing file_url:', error);
    }
  }

  // Delete files from storage
  if (filesToDelete.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(submissionsBucket)
      .remove(filesToDelete);

    if (storageError) {
      console.error('Error deleting files from storage:', storageError);
      // Continue with deletion even if storage deletion fails
    }
  }

  // Log the deletion action for audit trail
  const deletionDetails: Database['public']['Tables']['audit_log']['Insert']['details'] = {
    submission_title: submission.title,
    submission_owner_id: submission.owner_id,
    deleted_files: filesToDelete,
    google_docs_link: submission.google_docs_link,
  };

  await supabase.from('audit_log').insert({
    submission_id: id,
    actor_id: profile.id,
    action: 'submission_deleted',
    details: deletionDetails,
  });

  // Delete the submission record from database (db() uses service role, bypasses RLS)
  const { data: deleteResult, error: deleteError } = await supabase
    .from('submissions')
    .delete()
    .eq('id', id)
    .select();

  if (deleteError) {
    console.error('Failed to delete submission:', deleteError.message);
    return NextResponse.json(
      { error: `Failed to delete submission: ${deleteError.message}` },
      { status: 400 }
    );
  }

  if (!deleteResult || deleteResult.length === 0) {
    return NextResponse.json(
      { error: 'Failed to delete submission - it may not exist' },
      { status: 400 }
    );
  }

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
