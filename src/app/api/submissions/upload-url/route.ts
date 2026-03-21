import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import { ensureProfile } from '@/lib/auth/clerk';
import { createPresignedUploadUrl, getBucketName, getSubmissionsBucketName } from '@/lib/storage';
import { rateLimit, apiMutationLimiter } from '@/lib/rate-limit';

const ALLOWED_WRITING_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'text/plain',
];
const ALLOWED_WRITING_EXTENSIONS = ['.doc', '.docx', '.pdf', '.txt'];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = rateLimit(`upload-url:${profile.id}`, apiMutationLimiter);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
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
    return NextResponse.json({ error: 'File size must be less than 10MB.' }, { status: 400 });
  }

  if (type === 'writing') {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (!ALLOWED_WRITING_TYPES.includes(contentType) && !ALLOWED_WRITING_EXTENSIONS.includes(ext)) {
      return NextResponse.json({
        error: 'Writing submissions must be .doc, .docx, .pdf, or .txt files.',
      }, { status: 400 });
    }
  }

  const sanitizedFileName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${profile.id}/${Date.now()}-${sanitizedFileName}`;
  const bucket = type === 'writing' ? getSubmissionsBucketName() : getBucketName();

  const uploadUrl = await createPresignedUploadUrl(bucket, filePath, contentType);
  if (!uploadUrl) {
    return NextResponse.json({ error: 'Failed to generate upload URL. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({ uploadUrl, filePath });
}
