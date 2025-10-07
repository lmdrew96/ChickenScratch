import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';
import type { Database } from '@/types/database';

const createSubmissionSchema = z.object({
  title: z.string().min(3).max(200),
  type: z.enum(['writing', 'visual']),
  genre: z.string().max(120).optional().nullable(),
  summary: z.string().max(500).optional().nullable(),
  contentWarnings: z.string().max(500).optional().nullable(),
  wordCount: z.number().int().min(0).max(50000).optional().nullable(),
  textBody: z.string().max(50000).optional().nullable(),
  artFiles: z.array(z.string()).optional(),
  coverImage: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = createSubmissionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid submission data.' }, { status: 400 });
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const insertPayload: Database['public']['Tables']['submissions']['Insert'] = {
    owner_id: user.id,
    title: parsed.data.title,
    type: parsed.data.type,
    genre: parsed.data.genre ?? null,
    summary: parsed.data.summary ?? null,
    content_warnings: parsed.data.contentWarnings ?? null,
    word_count: parsed.data.wordCount ?? null,
    text_body: parsed.data.textBody ?? null,
    art_files: parsed.data.artFiles ?? [],
    cover_image: parsed.data.coverImage ?? null,
    status: 'submitted',
  };

  const { data, error } = await supabase
    .from('submissions')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidatePath('/mine');
  revalidatePath('/editor');
  return NextResponse.json({ success: true, submission: data });
}

export async function GET() {
  const supabase = await createSupabaseRouteHandlerClient();
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

  if (!profileData || !profileData.role || !['editor', 'admin'].includes(profileData.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: submissions, error } = await supabase
    .from('submissions')
    .select(`
      *,
      assigned_editor_profile:profiles!submissions_assigned_editor_fkey(id, name, email)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ submissions });
}
