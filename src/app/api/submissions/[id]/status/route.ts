import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { sendSubmissionEmail } from '@/lib/email';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database, Json, Profile, Submission } from '@/types/database';

const statusSchema = z.object({
  status: z.enum(['under_review', 'needs_revision', 'approved', 'declined']),
  editorNotes: z.string().max(4000).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = statusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid status payload.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const profile = profileData as Pick<Profile, 'role'> | null;

  if (!profile || !['editor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: submissionData, error: fetchError } = await supabase
    .from('submissions')
    .select('id, title, status, owner_id, editor_notes')
    .eq('id', id)
    .maybeSingle();

  const submission = submissionData as Pick<
    Submission,
    'id' | 'title' | 'status' | 'owner_id' | 'editor_notes'
  > | null;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  }

  if (parsed.data.status === 'needs_revision' && !parsed.data.editorNotes?.trim()) {
    return NextResponse.json({ error: 'Editor notes are required for revisions.' }, { status: 400 });
  }

  const updates: Database['public']['Tables']['submissions']['Update'] = {
    status: parsed.data.status,
  };

  if (['approved', 'declined', 'needs_revision'].includes(parsed.data.status)) {
    updates.decision_date = new Date().toISOString();
  }

  if (parsed.data.editorNotes !== undefined) {
    updates.editor_notes = parsed.data.editorNotes;
  }

  const { error: updateError } = await supabase
    .from('submissions')
    .update(updates)
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  const statusDetails: Json = {
    from: submission.status,
    to: parsed.data.status,
  };

  await supabase.from('audit_log').insert({
    submission_id: id,
    actor_id: user.id,
    action: 'status_change',
    details: statusDetails,
  });

  const { data: ownerProfileData } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('id', submission.owner_id)
    .maybeSingle();

  const ownerProfile = ownerProfileData as Pick<Profile, 'email' | 'name'> | null;

  const ownerEmail = ownerProfile?.email;
  if (ownerEmail) {
    const template = parsed.data.status === 'approved' ? 'accepted' : parsed.data.status === 'declined'
        ? 'declined'
        : parsed.data.status === 'needs_revision'
          ? 'needs_revision'
          : null;

    if (template) {
      await sendSubmissionEmail({
        template,
        to: ownerEmail,
        submission: { id: submission.id, title: submission.title },
        editorNotes: parsed.data.editorNotes,
      });
    }
  }

  revalidatePath('/editor');
  revalidatePath('/mine');
  revalidatePath('/published');
  return NextResponse.json({ success: true });
}
