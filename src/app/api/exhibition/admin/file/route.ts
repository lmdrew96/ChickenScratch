import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasOfficerAccess } from '@/lib/auth/guards';
import { createSignedUrl, getBucketName, getSubmissionsBucketName } from '@/lib/storage';

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const database = db();
  const roleRows = await database
    .select({ roles: userRoles.roles, positions: userRoles.positions })
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const role = roleRows[0];
  if (!role || !hasOfficerAccess(role.positions as string[], role.roles as string[])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path');
  const type = searchParams.get('type');
  const action = searchParams.get('action') ?? 'preview';
  const filename = searchParams.get('filename') ?? undefined;

  if (!path) {
    return NextResponse.json({ error: 'path is required.' }, { status: 400 });
  }
  if (type !== 'writing' && type !== 'visual') {
    return NextResponse.json({ error: 'Invalid exhibition type.' }, { status: 400 });
  }
  if (action !== 'preview' && action !== 'download') {
    return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
  }

  const bucket = type === 'writing' ? getSubmissionsBucketName() : getBucketName();
  const signedUrl = await createSignedUrl(path, 60 * 10, bucket, {
    inline: action === 'preview',
    downloadFileName: filename,
  });

  if (!signedUrl) {
    return NextResponse.json({ error: 'Unable to generate file link.' }, { status: 500 });
  }

  return NextResponse.redirect(signedUrl);
}

