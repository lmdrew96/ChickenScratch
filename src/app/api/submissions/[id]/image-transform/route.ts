import { NextResponse, type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { submissions, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess } from '@/lib/auth/guards';
import { createPresignedUploadUrl, createSignedUrl } from '@/lib/storage';

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

/** GET — returns a presigned PUT URL for uploading the processed image directly to R2. */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const authResult = await authorize();
  if (!authResult) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const processedPath = `processed/${id}/${Date.now()}.png`;
  const uploadUrl = await createPresignedUploadUrl('art', processedPath, 'image/png', 300);
  if (!uploadUrl) {
    return NextResponse.json({ error: 'Failed to generate upload URL.' }, { status: 500 });
  }

  return NextResponse.json({ uploadUrl, processedPath });
}

/** PATCH — records the processed image path after the client has uploaded it directly to R2. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const authResult = await authorize();
  if (!authResult) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { database } = authResult;

  const body = await request.json().catch(() => null) as { processedPath?: string; originalPath?: string } | null;
  if (!body) return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 });

  const { processedPath, originalPath } = body;
  if (typeof processedPath !== 'string' || !processedPath) {
    return NextResponse.json({ error: 'Missing processedPath.' }, { status: 400 });
  }
  if (typeof originalPath !== 'string' || !originalPath) {
    return NextResponse.json({ error: 'Missing originalPath.' }, { status: 400 });
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
