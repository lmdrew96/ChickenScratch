import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';
import { uploadFile, getSubmissionsBucketName, getBucketName } from '@/lib/storage';
import type { Database } from '@/types/database';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    
    const title = formData.get('title') as string;
    const type = formData.get('type') as 'writing' | 'visual';
    const genre = formData.get('genre') as string | null;
    const summary = formData.get('summary') as string | null;
    const contentWarnings = formData.get('contentWarnings') as string | null;
    const file = formData.get('file') as File | null;

    // Validate required fields
    if (!title || title.length < 3 || title.length > 200) {
      return NextResponse.json({ error: 'Title must be between 3 and 200 characters.' }, { status: 400 });
    }

    if (!type || !['writing', 'visual'].includes(type)) {
      return NextResponse.json({ error: 'Invalid submission type.' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'File is required.' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 10MB.' }, { status: 400 });
    }

    // Validate file type based on submission type
    if (type === 'writing') {
      const allowedTypes = [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/pdf',
        'text/plain',
      ];
      const allowedExtensions = ['.doc', '.docx', '.pdf', '.txt'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
        return NextResponse.json({ 
          error: 'Writing submissions must be .doc, .docx, .pdf, or .txt files.' 
        }, { status: 400 });
      }
    }

    // Generate unique file path
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${user.id}/${timestamp}-${sanitizedFileName}`;

    // Determine which bucket to use
    const bucket = type === 'writing' ? getSubmissionsBucketName() : getBucketName();

    // Upload file to Supabase Storage
    const { path: uploadedPath, error: uploadError } = await uploadFile(
      supabase,
      bucket,
      filePath,
      file
    );

    if (uploadError || !uploadedPath) {
      console.error('File upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to upload file. Please try again.' 
      }, { status: 500 });
    }

    // Create submission record
    const insertPayload: Database['public']['Tables']['submissions']['Insert'] = {
      owner_id: user.id,
      title,
      type,
      genre: genre || null,
      summary: summary || null,
      content_warnings: contentWarnings || null,
      file_url: uploadedPath,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      status: 'submitted',
    };

    // For visual art, also set cover_image
    if (type === 'visual') {
      insertPayload.cover_image = uploadedPath;
      insertPayload.art_files = [uploadedPath];
    }

    const { data, error } = await supabase
      .from('submissions')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Send notification to Submissions Coordinators about new submission
    console.log('[Submission] Triggering notification for new submission:', data.id);
    try {
      // Fetch author name from profiles
      const { data: authorProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const notificationResponse = await fetch(`${request.nextUrl.origin}/api/notifications/submission-assigned`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
        body: JSON.stringify({
          submissionId: data.id,
          notificationType: 'new_submission',
          submissionTitle: data.title,
          submissionType: data.type,
          submissionGenre: data.genre,
          submissionDate: data.created_at,
          authorName: authorProfile?.full_name || authorProfile?.email || 'Unknown',
        }),
      });

      if (!notificationResponse.ok) {
        const errorData = await notificationResponse.json();
        console.error('[Submission] Notification failed:', errorData);
        // Don't fail the submission if notification fails, just log it
      } else {
        const notificationResult = await notificationResponse.json();
        console.log('[Submission] Notification sent:', notificationResult);
      }
    } catch (notificationError) {
      console.error('[Submission] Error sending notification:', notificationError);
      // Don't fail the submission if notification fails
    }

    revalidatePath('/mine');
    revalidatePath('/editor');
    return NextResponse.json({ success: true, submission: data });
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json({ 
      error: 'An error occurred while processing your submission.' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine');

  // If requesting own submissions, allow any authenticated user
  if (mine === '1') {
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select(`
        *,
        assigned_editor_profile:profiles!submissions_assigned_editor_fkey(id, name, email)
      `)
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ submissions });
  }

  // For all submissions, require editor or admin role
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profileData || !profileData.role || !['editor', 'admin'].includes(profileData.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: submissions, error } = await supabase
    .from('submissions')
    .select(`
      *,
      assigned_editor_profile:profiles!submissions_assigned_editor_fkey(id, name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ submissions });
}
