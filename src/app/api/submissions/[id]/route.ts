import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { submissions } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { EDITABLE_STATUSES, SUBMISSION_TYPES } from '@/lib/constants';
import { assertUserOwnsPath } from '@/lib/storage';
import type { Submission } from '@/types/database';

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

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid update payload.' }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const database = db();

  const submissionResult = await database
    .select({ id: submissions.id, owner_id: submissions.owner_id, status: submissions.status })
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);

  const submission = submissionResult[0] as Pick<Submission, 'id' | 'owner_id' | 'status'> | undefined;

  if (!submission) {
    return NextResponse.json({ error: 'Submission not found.' }, { status: 404 });
  }

  if (submission.owner_id !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!EDITABLE_STATUSES.includes(submission.status as (typeof EDITABLE_STATUSES)[number])) {
    return NextResponse.json({ error: 'This submission is no longer editable.' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};

  if (parsed.data.title) updates.title = parsed.data.title;
  if (parsed.data.type) updates.type = parsed.data.type;
  if (parsed.data.genre !== undefined) updates.genre = parsed.data.genre;
  if (parsed.data.summary !== undefined) updates.summary = parsed.data.summary;
  if (parsed.data.contentWarnings !== undefined)
    updates.content_warnings = parsed.data.contentWarnings;
  if (parsed.data.wordCount !== undefined) updates.word_count = parsed.data.wordCount;
  if (parsed.data.textBody !== undefined) updates.text_body = parsed.data.textBody;

  if (parsed.data.artFiles !== undefined) {
    if (parsed.data.artFiles.length > 5) {
      return NextResponse.json(
        { error: 'Visual submissions can include up to five files.' },
        { status: 400 }
      );
    }
    for (const path of parsed.data.artFiles) {
      assertUserOwnsPath(profile.id, path);
    }
    updates.art_files = parsed.data.artFiles;
  }

  if (parsed.data.coverImage !== undefined && parsed.data.coverImage !== null) {
    assertUserOwnsPath(profile.id, parsed.data.coverImage);
    updates.cover_image = parsed.data.coverImage;
  }

  if (parsed.data.coverImage === null) {
    updates.cover_image = null;
  }

  try {
    await database
      .update(submissions)
      .set(updates)
      .where(eq(submissions.id, id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Update failed' }, { status: 400 });
  }

  revalidatePath('/mine');
  revalidatePath('/editor');
  return NextResponse.json({ success: true });
}
