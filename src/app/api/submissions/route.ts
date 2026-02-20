import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { eq, desc, inArray } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { submissions, profiles, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess, hasEditorAccess } from '@/lib/auth/guards';
import { uploadFile, getSubmissionsBucketName, getBucketName } from '@/lib/storage';
import { sendSubmissionNotification } from '@/lib/notifications';
import type { NewSubmission } from '@/types/database';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();

    const title = formData.get('title')?.toString() ?? '';
    const type = formData.get('type')?.toString() ?? '';
    const genre = formData.get('genre')?.toString() || null;
    const summary = formData.get('summary')?.toString() || null;
    const preferredName = formData.get('preferredName')?.toString() || null;
    const contentWarnings = formData.get('contentWarnings')?.toString() || null;
    const file = formData.get('file') as File | null;

    if (!title || title.length < 3 || title.length > 200) {
      return NextResponse.json({ error: 'Title must be between 3 and 200 characters.' }, { status: 400 });
    }

    if (type !== 'writing' && type !== 'visual') {
      return NextResponse.json({ error: 'Invalid submission type.' }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: 'File is required.' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 10MB.' }, { status: 400 });
    }

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

    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `${profile.id}/${timestamp}-${sanitizedFileName}`;

    const bucket = type === 'writing' ? getSubmissionsBucketName() : getBucketName();

    const { path: uploadedPath, error: uploadError } = await uploadFile(
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

    const insertPayload: NewSubmission = {
      owner_id: profile.id,
      title,
      type,
      genre: genre || null,
      preferred_name: preferredName,
      summary: summary || null,
      content_warnings: contentWarnings || null,
      file_url: uploadedPath,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      status: 'submitted',
    };

    if (type === 'visual') {
      insertPayload.cover_image = uploadedPath;
      insertPayload.art_files = [uploadedPath];
    }

    const database = db();
    const result = await database
      .insert(submissions)
      .values(insertPayload)
      .returning();

    const data = result[0];
    if (!data) {
      return NextResponse.json({ error: 'Failed to create submission' }, { status: 400 });
    }

    // Send notification to Submissions Coordinators about new submission
    try {
      await sendSubmissionNotification({
        submissionId: data.id,
        notificationType: 'new_submission',
        submissionTitle: data.title,
        submissionType: data.type,
        submissionGenre: data.genre ?? undefined,
        submissionDate: data.created_at?.toISOString(),
        authorName: profile.full_name || profile.email || 'Unknown',
      });
    } catch (notificationError) {
      console.error('Error sending notification:', notificationError);
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
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const database = db();
  const { searchParams } = new URL(request.url);
  const mine = searchParams.get('mine');

  if (mine === '1') {
    // Fetch user's own submissions
    const userSubmissions = await database
      .select()
      .from(submissions)
      .where(eq(submissions.owner_id, profile.id))
      .orderBy(desc(submissions.created_at));

    // Lookup assigned editors
    const editorIds = [...new Set(userSubmissions.map(s => s.assigned_editor).filter(Boolean))] as string[];
    let editorMap = new Map<string, { id: string; name: string | null; email: string | null }>();

    if (editorIds.length > 0) {
      const editors = await database
        .select({ id: profiles.id, name: profiles.name, email: profiles.email })
        .from(profiles)
        .where(inArray(profiles.id, editorIds));
      editorMap = new Map(editors.map(e => [e.id, e]));
    }

    const submissionsWithEditor = userSubmissions.map(s => ({
      ...s,
      assigned_editor_profile: s.assigned_editor ? editorMap.get(s.assigned_editor) ?? null : null,
    }));

    return NextResponse.json({ submissions: submissionsWithEditor });
  }

  // For all submissions, require editor/committee/officer role
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

  const allSubmissions = await database
    .select()
    .from(submissions)
    .orderBy(desc(submissions.created_at));

  // Lookup assigned editors
  const editorIds = [...new Set(allSubmissions.map(s => s.assigned_editor).filter(Boolean))] as string[];
  let editorMap = new Map<string, { id: string; name: string | null; email: string | null }>();

  if (editorIds.length > 0) {
    const editors = await database
      .select({ id: profiles.id, name: profiles.name, email: profiles.email })
      .from(profiles)
      .where(inArray(profiles.id, editorIds));
    editorMap = new Map(editors.map(e => [e.id, e]));
  }

  const submissionsWithEditor = allSubmissions.map(s => ({
    ...s,
    assigned_editor_profile: s.assigned_editor ? editorMap.get(s.assigned_editor) ?? null : null,
  }));

  return NextResponse.json({ submissions: submissionsWithEditor });
}
