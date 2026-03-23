import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { submissions, userRoles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess } from '@/lib/auth/guards';

const cropSchema = z.object({
  top: z.number().min(0).max(50),
  right: z.number().min(0).max(50),
  bottom: z.number().min(0).max(50),
  left: z.number().min(0).max(50),
});

const schema = z.object({
  rotation: z.union([z.literal(0), z.literal(90), z.literal(180), z.literal(270)]).optional(),
  crop: cropSchema.optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const database = db();
  const roleRows = await database
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const roleData = roleRows[0];
  if (!roleData?.is_member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const positions = roleData.positions ?? [];
  const roles = roleData.roles ?? [];
  if (!hasOfficerAccess(positions, roles) && !hasCommitteeAccess(positions, roles)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 });
  }

  const transform = parsed.data;

  await database
    .update(submissions)
    .set({ image_transform: Object.keys(transform).length ? transform : null })
    .where(eq(submissions.id, id));

  return NextResponse.json({ success: true, transform });
}
