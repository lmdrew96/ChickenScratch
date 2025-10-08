import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getSubmissionsBucketName } from '@/lib/storage';
import type { Database, Submission } from '@/types/database';

type UserRole = Database['public']['Tables']['user_roles']['Row'];

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  console.log('[Delete API] Request received for ID:', id);

  // Authenticate user
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('[Delete API] User authenticated:', user?.id);

  if (!user) {
    console.log('[Delete API] No user found - unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has admin permissions (BBEG or Dictator-in-Chief)
  const { data: userRoleData, error: roleError } = await supabase
    .from('user_roles')
    .select('positions')
    .eq('user_id', user.id)
    .maybeSingle();

  console.log('[Delete API] User role data:', userRoleData);
  console.log('[Delete API] Role fetch error:', roleError);

  const userRole = userRoleData as Pick<UserRole, 'positions'> | null;

  const isAdmin =
    userRole?.positions?.includes('BBEG') ||
    userRole?.positions?.includes('Dictator-in-Chief');

  console.log('[Delete API] Is admin:', isAdmin, 'Positions:', userRole?.positions);

  if (!isAdmin) {
    console.log('[Delete API] User is not admin - forbidden');
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

  // Use admin client for storage operations to bypass RLS
  const adminClient = createSupabaseAdminClient();
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
    const { error: storageError } = await adminClient.storage
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
    actor_id: user.id,
    action: 'submission_deleted',
    details: deletionDetails,
  });

  // Delete the submission record from database using admin client to bypass RLS
  console.log('[Delete API] Attempting to delete submission from database using admin client');
  const { data: deleteResult, error: deleteError } = await adminClient
    .from('submissions')
    .delete()
    .eq('id', id)
    .select();

  console.log('[Delete API] Delete result:', deleteResult);
  console.log('[Delete API] Delete error:', deleteError);

  if (deleteError) {
    console.error('[Delete API] Failed to delete submission:', deleteError);
    return NextResponse.json(
      { error: `Failed to delete submission: ${deleteError.message}` },
      { status: 400 }
    );
  }

  if (!deleteResult || deleteResult.length === 0) {
    console.log('[Delete API] No rows were deleted - submission may not exist');
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

  console.log('[Delete API] Submission deleted successfully');

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
