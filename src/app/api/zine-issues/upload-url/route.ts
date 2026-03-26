import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess } from '@/lib/auth/guards';
import { createPresignedUploadUrl, getPublicUrl } from '@/lib/storage';
import { rateLimit, apiMutationLimiter } from '@/lib/rate-limit';

const ZINES_BUCKET = 'zines';
const PDF_MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const database = db();
  const userRoleRows = await database
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);
  const userRoleData = userRoleRows[0] ?? null;

  if (
    !userRoleData?.is_member ||
    (!hasCommitteeAccess(userRoleData.positions, userRoleData.roles) &&
      !hasOfficerAccess(userRoleData.positions, userRoleData.roles))
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const limit = rateLimit(`zine-upload-url:${profile.id}`, apiMutationLimiter);
  if (!limit.success) {
    return NextResponse.json({ error: 'Too many requests.' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('filename');
  const fileSize = parseInt(searchParams.get('fileSize') ?? '0', 10);

  if (!filename) {
    return NextResponse.json({ error: 'filename is required.' }, { status: 400 });
  }
  if (fileSize > PDF_MAX_BYTES) {
    return NextResponse.json({ error: 'PDF must be under 50 MB.' }, { status: 400 });
  }

  const sanitizedName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `${Date.now()}-${sanitizedName}`;

  const uploadUrl = await createPresignedUploadUrl(ZINES_BUCKET, filePath, 'application/pdf');
  if (!uploadUrl) {
    return NextResponse.json({ error: 'Failed to generate upload URL.' }, { status: 500 });
  }

  const publicUrl = getPublicUrl(ZINES_BUCKET, filePath);
  return NextResponse.json({ uploadUrl, filePath, publicUrl });
}
