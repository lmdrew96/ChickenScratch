import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { submissions, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess } from '@/lib/auth/guards';
import { uploadFile, createSignedUrl } from '@/lib/storage';

async function authorize() {
  const { userId } = await auth();
  if (!userId) return null;

  const profile = await ensureProfile(userId);
  if (!profile) return null;

  const database = db();
  const roleRows = await database
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const roleData = roleRows[0];
  if (!roleData?.is_member) return null;

  const positions = roleData.positions ?? [];
  const roles = roleData.roles ?? [];
  if (!hasOfficerAccess(positions, roles) && !hasCommitteeAccess(positions, roles)) return null;

  return { database, profile };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const authResult = await authorize();
  if (!authResult) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { database } = authResult;

  const formData = await request.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 });

  const file = formData.get('file');
  const originalPath = formData.get('originalPath');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file.' }, { status: 400 });
  }
  if (typeof originalPath !== 'string' || !originalPath) {
    return NextResponse.json({ error: 'Missing originalPath.' }, { status: 400 });
  }

  const timestamp = Date.now();
  const processedPath = `processed/${id}/${timestamp}.png`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await uploadFile('art', processedPath, buffer, {
    contentType: 'image/png',
  });

  if (uploadError) {
    console.error('Failed to upload processed image', uploadError);
    return NextResponse.json({ error: 'Upload failed.' }, { status: 500 });
  }

  const transform = { processedPath, originalPath };

  await database
    .update(submissions)
    .set({ image_transform: transform })
    .where(eq(submissions.id, id));

  const signedUrl = await createSignedUrl(processedPath);

  return NextResponse.json({ success: true, signedUrl, transform });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const authResult = await authorize();
  if (!authResult) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { database } = authResult;

  await database
    .update(submissions)
    .set({ image_transform: null })
    .where(eq(submissions.id, id));

  return NextResponse.json({ success: true });
}
