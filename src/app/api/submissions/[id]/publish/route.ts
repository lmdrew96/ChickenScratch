import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { submissions, auditLog } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';

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

  if (!profile.role || !['editor', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const database = db();

  const updates: Record<string, unknown> = {
    published: parsed.data.published,
    published_url: parsed.data.publishedUrl ?? null,
    issue: parsed.data.issue ?? null,
  };

  if (parsed.data.published) {
    updates.status = 'published';
  }

  try {
    await database
      .update(submissions)
      .set(updates)
      .where(eq(submissions.id, id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 400 });
  }

  await database.insert(auditLog).values({
    submission_id: id,
    actor_id: profile.id,
    action: 'publish',
    details: Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    ),
  });

  revalidatePath('/editor');
  revalidatePath('/published');
  revalidatePath('/mine');
  return NextResponse.json({ success: true });
}
