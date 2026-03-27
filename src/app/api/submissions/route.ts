import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { eq, desc, inArray } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { submissions, profiles, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess, hasEditorAccess } from '@/lib/auth/guards';
import { sendSubmissionNotification } from '@/lib/notifications';
import { rateLimit, apiMutationLimiter } from '@/lib/rate-limit';
import { importTextForProofread } from '@/lib/import-text-for-proofread';
import type { NewSubmission } from '@/types/database';


export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = rateLimit(`submit:${profile.id}`, apiMutationLimiter);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  try {
    const formData = await request.formData();

    const title = formData.get('title')?.toString() ?? '';
    const type = formData.get('type')?.toString() ?? '';
    const genre = formData.get('genre')?.toString() || null;
    const summary = formData.get('summary')?.toString() || null;
    const preferredName = formData.get('preferredName')?.toString() || null;
    const contentWarnings = formData.get('contentWarnings')?.toString() || null;
    const filePath = formData.get('filePath')?.toString() ?? '';
    const filePathsRaw = formData.get('filePaths')?.toString();
    const fileName = formData.get('fileName')?.toString() ?? '';
    const fileType = formData.get('fileType')?.toString() ?? '';
    const fileSize = parseInt(formData.get('fileSize')?.toString() ?? '0', 10);

    if (!title || title.length < 3 || title.length > 200) {
      return NextResponse.json({ error: 'Title must be between 3 and 200 characters.' }, { status: 400 });
    }

    if (type !== 'writing' && type !== 'visual') {
      return NextResponse.json({ error: 'Invalid submission type.' }, { status: 400 });
    }

    if (!filePath) {
      return NextResponse.json({ error: 'File is required.' }, { status: 400 });
    }

    // Guard: filePath must belong to this user (set by upload-url route)
    if (!filePath.startsWith(`${profile.id}/`)) {
      return NextResponse.json({ error: 'Invalid file path.' }, { status: 400 });
    }

    // Parse additional file paths for visual submissions (up to 3 images)
    let allFilePaths: string[] = [filePath];
    if (type === 'visual' && filePathsRaw) {
      try {
        const parsed: unknown = JSON.parse(filePathsRaw);
        if (Array.isArray(parsed) && parsed.length >= 1 && parsed.length <= 3) {
          const paths = parsed as string[];
          if (paths.every((p) => typeof p === 'string' && p.startsWith(`${profile.id}/`))) {
            allFilePaths = paths;
          }
        }
      } catch { /* fall back to single filePath */ }
    }

    const insertPayload: NewSubmission = {
      owner_id: profile.id,
      title,
      type,
      genre: genre || null,
      preferred_name: preferredName,
      summary: summary || null,
      content_warnings: contentWarnings || null,
      file_url: filePath,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      status: 'submitted',
    };

    if (type === 'visual') {
      insertPayload.cover_image = filePath;
      insertPayload.art_files = allFilePaths;
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

    // For writing submissions, kick off text import immediately (non-blocking)
    if (data.type === 'writing') {
      void importTextForProofread(data.id, profile.id).catch((err) => {
        console.error('[importTextForProofread] Background import failed:', err);
      });
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
