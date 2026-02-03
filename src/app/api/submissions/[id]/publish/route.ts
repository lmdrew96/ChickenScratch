import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/supabase/db';
import { ensureProfile } from '@/lib/auth/clerk';
import type { Database, Json } from '@/types/database';

const publishSchema = z.object({
  published: z.boolean(),
  publishedUrl: z.string().url().optional().nullable(),
  issue: z.string().max(120).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = publishSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid publish payload.' }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = db();

  if (!profile.role || !['editor', 'admin'].includes(profile.role)) {
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
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const auditDetails: Json = Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined)
  ) as Json;

  await supabase.from('audit_log').insert({
    submission_id: id,
    actor_id: profile.id,
    action: 'publish',
    details: auditDetails,
  });

  revalidatePath('/editor');
  revalidatePath('/published');
  revalidatePath('/mine');
  return NextResponse.json({ success: true });
}
