import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess } from '@/lib/auth/guards';
import { importTextForProofread } from '@/lib/import-text-for-proofread';

const convertRequestSchema = z.object({
  submission_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = convertRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request data.' }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const database = db();

  const userRoleResult = await database
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const userRoleData = userRoleResult[0];

  if (!userRoleData?.is_member) {
    return NextResponse.json({ error: 'Forbidden - Committee access required' }, { status: 403 });
  }

  const positions = (userRoleData.positions as string[]) ?? [];
  const roles = (userRoleData.roles as string[]) ?? [];

  if (!hasCommitteeAccess(positions, roles)) {
    return NextResponse.json({ error: 'Forbidden - Committee access required' }, { status: 403 });
  }

  const { submission_id } = parsed.data;

  try {
    await importTextForProofread(submission_id, profile.id);
    return NextResponse.json({
      success: true,
      proofread_editor_url: `/committee/proofread/${submission_id}`,
    });
  } catch (error) {
    console.error('[import-text-for-proofread] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
