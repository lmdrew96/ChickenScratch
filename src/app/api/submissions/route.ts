import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { enforceSubmissionRateLimit, SubmissionRateLimitError } from '@/lib/rate-limit';
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';
import { assertUserOwnsPath } from '@/lib/storage';
import type { Database } from '@/types/database';

const submissionPayloadSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(3).max(200),
  type: z.enum(['writing', 'visual']),
  genre: z.string().max(120).optional().nullable(),
  summary: z.string().max(500).optional().nullable(),
  contentWarnings: z.string().max(500).optional().nullable(),
  wordCount: z.number().int().min(0).max(50000).optional().nullable(),
  textBody: z.string().max(50000).optional().nullable(),
  artFiles: z.array(z.string().min(1)).max(5).optional(),
  coverImage: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = submissionPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid submission payload.' }, { status: 400 });
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await enforceSubmissionRateLimit(supabase, user.id);
  } catch (error) {
    if (error instanceof SubmissionRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    throw error;
  }

  const artFiles = parsed.data.artFiles ?? [];
  for (const path of artFiles) {
    assertUserOwnsPath(user.id, path);
  }

  if (parsed.data.coverImage) {
    assertUserOwnsPath(user.id, parsed.data.coverImage);
  }

  if (parsed.data.type === 'writing' && !parsed.data.textBody?.trim()) {
    return NextResponse.json({ error: 'Writing submissions must include text.' }, { status: 400 });
  }

  if (parsed.data.type === 'visual' && artFiles.length === 0) {
    return NextResponse.json({ error: 'Visual submissions must include at least one file.' }, { status: 400 });
  }

  const insertPayload: Database['public']['Tables']['submissions']['Insert'] = {
    id: parsed.data.id,
    owner_id: user.id,
    title: parsed.data.title,
    type: parsed.data.type,
    genre: parsed.data.genre ?? null,
    summary: parsed.data.summary ?? null,
    content_warnings: parsed.data.contentWarnings ?? null,
    word_count: parsed.data.wordCount ?? null,
    text_body: parsed.data.textBody ?? null,
    art_files: artFiles,
    cover_image: parsed.data.coverImage ?? null,
  };

  const { error } = await supabase.from('submissions').insert(insertPayload);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath('/mine');
  revalidatePath('/submit');
  return NextResponse.json({ success: true });
}
