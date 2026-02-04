import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { submissions, auditLog } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';

const notesSchema = z.object({
  editorNotes: z.string().max(4000).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = notesSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid notes payload.' }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!profile.role || !['editor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const database = db();

  try {
    await database
      .update(submissions)
      .set({ editor_notes: parsed.data.editorNotes ?? null })
      .where(eq(submissions.id, id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 400 });
  }

  await database.insert(auditLog).values({
    submission_id: id,
    actor_id: profile.id,
    action: 'note',
    details: { editor_notes: parsed.data.editorNotes ?? null },
  });

  revalidatePath('/editor');
  revalidatePath('/mine');
  return NextResponse.json({ success: true });
}
