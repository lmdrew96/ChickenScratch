import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/supabase/db';
import { ensureProfile } from '@/lib/auth/clerk';
import type { Database, Json } from '@/types/database';

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
  const supabase = db();

  if (!profile.role || !['editor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updatePayload: Database['public']['Tables']['submissions']['Update'] = {
    editor_notes: parsed.data.editorNotes ?? null,
  };

  const { error } = await supabase
    .from('submissions')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const auditDetails: Json = {
    editor_notes: parsed.data.editorNotes ?? null,
  };

  await supabase.from('audit_log').insert({
    submission_id: id,
    actor_id: profile.id,
    action: 'note',
    details: auditDetails,
  });

  revalidatePath('/editor');
  revalidatePath('/mine');
  return NextResponse.json({ success: true });
}
