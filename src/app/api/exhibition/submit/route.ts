import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { exhibitionSubmissions, exhibitionConfig } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { rateLimit, apiMutationLimiter } from '@/lib/rate-limit';
import { createPresignedUploadUrl, getBucketName, getSubmissionsBucketName } from '@/lib/storage';
import {
  sendExhibitionConfirmation,
  notifyOfficersOfExhibitionSubmission,
} from '@/lib/exhibition-email';
import type { NewExhibitionSubmission } from '@/types/database';
import { getCurrentUserRole } from '@/lib/actions/roles';

const ALLOWED_ART_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'image/gif'];
const ALLOWED_WRITING_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'text/plain',
];
const ALLOWED_WRITING_EXTENSIONS = ['.doc', '.docx', '.pdf', '.txt'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = await getCurrentUserRole();
  if (!userRole?.is_member) {
    return NextResponse.json({ error: 'Only members can submit to the exhibition.' }, { status: 403 });
  }

  const limit = rateLimit(`exhibition-submit:${profile.id}`, apiMutationLimiter);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  // Check if submissions are open
  try {
    const database = db();
    const configRows = await database.select().from(exhibitionConfig);
    const config: Record<string, string> = {};
    for (const row of configRows) {
      config[row.key] = row.value;
    }
    if (config.submissions_open === 'false') {
      return NextResponse.json({ error: 'Exhibition submissions are currently closed.' }, { status: 403 });
    }
    if (config.submission_deadline) {
      const deadline = new Date(config.submission_deadline);
      if (!isNaN(deadline.getTime()) && new Date() > deadline) {
        return NextResponse.json({ error: 'The submission deadline has passed.' }, { status: 403 });
      }
    }
  } catch {
    // Non-critical — allow submission if config can't be read
  }

  try {
    const body = await request.json() as Record<string, unknown>;

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const type = typeof body.type === 'string' ? body.type : '';
    const medium = typeof body.medium === 'string' ? body.medium : '';
    const preferredName = typeof body.preferred_name === 'string' ? body.preferred_name.trim() || null : null;
    const description = typeof body.description === 'string' ? body.description.trim() || null : null;
    const artistStatement = typeof body.artist_statement === 'string' ? body.artist_statement.trim() || null : null;
    const contentWarnings = typeof body.content_warnings === 'string' ? body.content_warnings.trim() || null : null;

    // File metadata
    const fileUrl = typeof body.file_url === 'string' ? body.file_url.trim() || null : null;
    const fileName = typeof body.file_name === 'string' ? body.file_name.trim() || null : null;
    const fileType = typeof body.file_type === 'string' ? body.file_type.trim() || null : null;
    const fileSize = typeof body.file_size === 'number' ? body.file_size : null;

    // Visual-specific
    const displayFormat = typeof body.display_format === 'string' ? body.display_format : null;
    const displayNotes = typeof body.display_notes === 'string' ? body.display_notes.trim() || null : null;

    if (!title || title.length < 1 || title.length > 200) {
      return NextResponse.json({ error: 'Title must be between 1 and 200 characters.' }, { status: 400 });
    }
    if (type !== 'writing' && type !== 'visual') {
      return NextResponse.json({ error: 'Type must be "writing" or "visual".' }, { status: 400 });
    }
    if (!medium) {
      return NextResponse.json({ error: 'Medium is required.' }, { status: 400 });
    }
    if (!fileUrl || !fileName || !fileType || !fileSize) {
      return NextResponse.json({ error: 'File upload metadata is required.' }, { status: 400 });
    }
    if (!fileUrl.startsWith(`${profile.id}/`)) {
      return NextResponse.json({ error: 'Invalid file path.' }, { status: 400 });
    }
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be smaller than 10 MB.' }, { status: 400 });
    }

    if (type === 'writing') {
      const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
      if (!ALLOWED_WRITING_TYPES.includes(fileType) && !ALLOWED_WRITING_EXTENSIONS.includes(ext)) {
        return NextResponse.json({ error: 'Writing files must be DOC, DOCX, PDF, or TXT.' }, { status: 400 });
      }
    }

    if (type === 'visual') {
      if (!ALLOWED_ART_TYPES.includes(fileType)) {
        return NextResponse.json({ error: 'Visual art files must be JPG, PNG, WebP, GIF, or PDF.' }, { status: 400 });
      }
      if (!displayFormat) return NextResponse.json({ error: 'Display format is required for visual art.' }, { status: 400 });
    }

    const insert: NewExhibitionSubmission = {
      owner_id: profile.id,
      preferred_name: preferredName,
      title,
      type,
      medium,
      description,
      artist_statement: artistStatement,
      content_warnings: contentWarnings,
      text_body: null,
      word_count: null,
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      display_format: displayFormat,
      display_notes: displayNotes,
      status: 'submitted',
    };

    const database = db();
    const result = await database.insert(exhibitionSubmissions).values(insert).returning();
    const submission = result[0];
    if (!submission) {
      return NextResponse.json({ error: 'Failed to create submission.' }, { status: 500 });
    }

    // Fire-and-forget emails
    const submitterName = profile.full_name || profile.name || profile.email || 'Submitter';
    const submitterEmail = profile.email;

    if (submitterEmail) {
      sendExhibitionConfirmation({
        to: submitterEmail,
        title,
        submissionId: submission.id,
      }).catch((err) => console.error('[exhibition-submit] confirmation email failed:', err));
    }

    notifyOfficersOfExhibitionSubmission({
      title,
      submitterName,
      type,
      medium,
      submissionId: submission.id,
    }).catch((err) => console.error('[exhibition-submit] officer notification failed:', err));

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error('[exhibition/submit] POST error:', error);
    return NextResponse.json({ error: 'Failed to submit.' }, { status: 500 });
  }
}

// GET /api/exhibition/submit — presigned upload URL for exhibition files
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userRole = await getCurrentUserRole();
  if (!userRole?.is_member) {
    return NextResponse.json({ error: 'Only members can upload exhibition files.' }, { status: 403 });
  }

  const limit = rateLimit(`exhibition-upload:${profile.id}`, apiMutationLimiter);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const filename = searchParams.get('filename');
  const contentType = searchParams.get('contentType');
  const fileSize = parseInt(searchParams.get('fileSize') ?? '0', 10);

  if (type !== 'writing' && type !== 'visual') {
    return NextResponse.json({ error: 'Invalid submission type.' }, { status: 400 });
  }
  if (!filename || !contentType) {
    return NextResponse.json({ error: 'filename and contentType are required.' }, { status: 400 });
  }
  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File must be smaller than 10 MB.' }, { status: 400 });
  }

  if (type === 'writing') {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (!ALLOWED_WRITING_TYPES.includes(contentType) && !ALLOWED_WRITING_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: 'Writing files must be DOC, DOCX, PDF, or TXT.' }, { status: 400 });
    }
  }

  if (type === 'visual' && !ALLOWED_ART_TYPES.includes(contentType)) {
    return NextResponse.json({ error: 'Only JPG, PNG, WebP, GIF, and PDF files are allowed.' }, { status: 400 });
  }

  const sanitizedFileName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${profile.id}/${Date.now()}-${sanitizedFileName}`;
  const bucket = type === 'writing' ? getSubmissionsBucketName() : getBucketName();

  const uploadUrl = await createPresignedUploadUrl(bucket, filePath, contentType);
  if (!uploadUrl) {
    return NextResponse.json({ error: 'Failed to generate upload URL.' }, { status: 500 });
  }

  return NextResponse.json({ uploadUrl, filePath });
}
