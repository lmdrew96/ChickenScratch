import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database, Json, Profile } from '@/types/database';

const publishSchema = z.object({
  published: z.boolean(),
  publishedUrl: z.string().url().optional().nullable(),
  issue: z.string().max(120).optional().nullable(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => null);
  const parsed = publishSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid publish payload.' }, { status: 400 });
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

  const updates: Database['public']['Tables']['submissions']['Update'] = {
    published: parsed.data.published,
    published_url: parsed.data.publishedUrl ?? null,
    issue: parsed.data.issue ?? null,
  };

  if (parsed.data.published) {
    updates.status = 'published';
  }

  const { error } = await supabase
    .from('submissions')
    .update(updates)
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const auditDetails: Json = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  ) as Json;

  await supabase.from('audit_log').insert({
    submission_id: params.id,
    actor_id: user.id,
    action: 'publish',
    details: auditDetails,
  });

  revalidatePath('/editor');
  revalidatePath('/published');
  revalidatePath('/mine');
  return NextResponse.json({ success: true });
}
