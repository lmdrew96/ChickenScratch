'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { meetingAgendas, creativePrompts } from '@/lib/db/schema';
import { requireOfficerRole } from '@/lib/auth/guards';

function revalidatePresident() {
  revalidatePath('/officers/toolkits/president');
}

export async function saveAgenda(input: {
  meeting_id: string;
  draft_md: string;
  finalize?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { profile } = await requireOfficerRole();
    const database = db();
    const existing = await database
      .select({ id: meetingAgendas.id })
      .from(meetingAgendas)
      .where(eq(meetingAgendas.meeting_id, input.meeting_id))
      .limit(1);
    const finalized_at = input.finalize ? new Date() : undefined;
    if (existing[0]) {
      await database
        .update(meetingAgendas)
        .set({
          draft_md: input.draft_md,
          updated_at: new Date(),
          updated_by: profile.id,
          ...(finalized_at !== undefined ? { finalized_at } : {}),
        })
        .where(eq(meetingAgendas.id, existing[0].id));
    } else {
      await database.insert(meetingAgendas).values({
        meeting_id: input.meeting_id,
        draft_md: input.draft_md,
        finalized_at,
        updated_by: profile.id,
      });
    }
    revalidatePresident();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export async function createPrompt(input: {
  text: string;
  tags?: string[];
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const { profile } = await requireOfficerRole();
    if (!input.text?.trim()) return { ok: false, error: 'Prompt text required' };
    const [row] = await db()
      .insert(creativePrompts)
      .values({
        text: input.text.trim(),
        tags: input.tags ?? [],
        created_by: profile.id,
      })
      .returning({ id: creativePrompts.id });
    revalidatePresident();
    return { ok: true, id: row!.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function markPromptUsed(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOfficerRole();
    const database = db();
    const [row] = await database
      .select({ first_used_at: creativePrompts.first_used_at })
      .from(creativePrompts)
      .where(eq(creativePrompts.id, id))
      .limit(1);
    const now = new Date();
    await database
      .update(creativePrompts)
      .set({
        last_used_at: now,
        ...(row?.first_used_at ? {} : { first_used_at: now }),
      })
      .where(eq(creativePrompts.id, id));
    revalidatePresident();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function markPromptUnused(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOfficerRole();
    await db()
      .update(creativePrompts)
      .set({ last_used_at: null, first_used_at: null })
      .where(eq(creativePrompts.id, id));
    revalidatePresident();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deletePrompt(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOfficerRole();
    await db().delete(creativePrompts).where(eq(creativePrompts.id, id));
    revalidatePresident();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}
