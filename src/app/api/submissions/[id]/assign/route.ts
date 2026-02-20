import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { submissions, auditLog } from '@/lib/db/schema';
import { requireProfile } from '@/lib/auth';
import { getCurrentUserRole } from '@/lib/actions/roles';

const assignSchema = z.object({
  editorId: z.string().uuid().nullable(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = assignSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid assignment payload.' }, { status: 400 });
  }

  const { profile } = await requireProfile();

  const userRole = await getCurrentUserRole();
  const isEditorInChief = userRole?.positions?.includes('Editor-in-Chief');

  if (!isEditorInChief) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const database = db();

  try {
    await database
      .update(submissions)
      .set({ assigned_editor: parsed.data.editorId ?? null })
      .where(eq(submissions.id, id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 400 });
  }

  await database.insert(auditLog).values({
    submission_id: id,
    actor_id: profile.id,
    action: 'assign',
    details: { assigned_editor: parsed.data.editorId ?? null },
  });

  revalidatePath('/editor');
  revalidatePath('/mine');
  return NextResponse.json({ success: true });
}
