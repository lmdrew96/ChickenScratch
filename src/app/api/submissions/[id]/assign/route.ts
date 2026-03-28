import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { submissions, auditLog } from '@/lib/db/schema';
import { requireProfile } from '@/lib/auth';
import { getCurrentUserRole } from '@/lib/actions/roles';
import { insertNotification } from '@/lib/actions/notifications';

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

  const submissionRow = await database
    .select({ title: submissions.title })
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);
  const submissionTitle = submissionRow[0]?.title ?? 'a submission';

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

  // Notify the assigned editor (if assigning someone other than self)
  if (parsed.data.editorId && parsed.data.editorId !== profile.id) {
    void insertNotification(
      parsed.data.editorId,
      'assignment',
      `You have been assigned as editor`,
      `"${submissionTitle}"`,
      '/editor',
    ).catch(() => {});
  }

  revalidatePath('/editor');
  revalidatePath('/mine');
  return NextResponse.json({ success: true });
}
