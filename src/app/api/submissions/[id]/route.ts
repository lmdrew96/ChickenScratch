import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { EDITABLE_STATUSES, SUBMISSION_TYPES } from '@/lib/constants';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { assertUserOwnsPath } from '@/lib/storage';
import type { Database, Submission } from '@/types/database';

const updateSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  type: z.enum(SUBMISSION_TYPES).optional(),
  genre: z.string().max(120).optional().nullable(),
  summary: z.string().max(500).optional().nullable(),
  contentWarnings: z.string().max(500).optional().nullable(),
  wordCount: z.number().int().min(0).max(50000).optional().nullable(),
  textBody: z.string().max(50000).optional().nullable(),
  artFiles: z.array(z.string()).optional(),
  coverImage: z.string().optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid update payload.' }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: submissionData, error: fetchError } = await supabase
    .from('submissions')
    .select('id, owner_id, status')
    .eq('id', params.id)
    .maybeSingle();

  const submission = submissionData as Pick<Submission, 'id' | 'owner_id' | 'status'> | null;

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  }

  if (submission.owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!EDITABLE_STATUSES.includes(submission.status as (typeof EDITABLE_STATUSES)[number])) {
    return NextResponse.json({ error: 'This submission is no longer editable.' }, { status: 403 });
  }

  const updates: Database['public']['Tables']['submissions']['Update'] = {};

  if (parsed.data.title) updates.title = parsed.data.title;
  if (parsed.data.type) updates.type = parsed.data.type;
  if (parsed.data.genre !== undefined) updates.genre = parsed.data.genre;
  if (parsed.data.summary !== undefined) updates.summary = parsed.data.summary;
  if (parsed.data.contentWarnings !== undefined)
    updates.content_warnings = parsed.data.contentWarnings;
  if (parsed.data.wordCount !== undefined) updates.word_count = parsed.data.wordCount;
  if (parsed.data.textBody !== undefined) updates.text_body = parsed.data.textBody;

  if (parsed.data.artFiles) {
    for (const path of parsed.data.artFiles) {
      assertUserOwnsPath(user.id, path);
    }
    updates.art_files = parsed.data.artFiles;
  }

  if (parsed.data.coverImage !== undefined && parsed.data.coverImage !== null) {
    assertUserOwnsPath(user.id, parsed.data.coverImage);
    updates.cover_image = parsed.data.coverImage;
  }

  if (parsed.data.coverImage === null) {
    updates.cover_image = null;
  }

  const { error } = await supabase
    .from('submissions')
    .update(updates)
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath('/mine');
  revalidatePath('/editor');
  return NextResponse.json({ success: true });
}
