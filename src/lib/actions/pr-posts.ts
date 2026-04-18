'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { prPosts } from '@/lib/db/schema';
import { requireOfficerRole } from '@/lib/auth/guards';
import type { PrPostStatus } from '@/lib/data/pr-post-queries';

function revalidatePr() {
  revalidatePath('/officers/toolkits/pr-chair');
}

export async function upsertPrPost(input: {
  id?: string;
  scheduled_for: string;
  status?: PrPostStatus;
  title?: string;
  draft_text?: string;
  channels?: string[];
  template?: string | null;
  notes?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const { profile } = await requireOfficerRole();
    const scheduled_for = new Date(input.scheduled_for);
    if (Number.isNaN(scheduled_for.getTime())) return { ok: false, error: 'Invalid date' };

    const database = db();
    if (input.id) {
      await database
        .update(prPosts)
        .set({
          status: input.status ?? 'drafted',
          title: input.title ?? null,
          draft_text: input.draft_text ?? null,
          channels: input.channels ?? [],
          template: input.template ?? null,
          notes: input.notes ?? null,
          updated_at: new Date(),
        })
        .where(eq(prPosts.id, input.id));
      revalidatePr();
      return { ok: true, id: input.id };
    }
    const [row] = await database
      .insert(prPosts)
      .values({
        scheduled_for,
        status: input.status ?? 'drafted',
        title: input.title ?? null,
        draft_text: input.draft_text ?? null,
        channels: input.channels ?? [],
        template: input.template ?? null,
        notes: input.notes ?? null,
        created_by: profile.id,
      })
      .returning({ id: prPosts.id });
    revalidatePr();
    return { ok: true, id: row!.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Save failed' };
  }
}

export async function transitionPrPostStatus(input: {
  id: string;
  status: PrPostStatus;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOfficerRole();
    await db()
      .update(prPosts)
      .set({ status: input.status, updated_at: new Date() })
      .where(eq(prPosts.id, input.id));
    revalidatePr();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deletePrPost(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOfficerRole();
    await db().delete(prPosts).where(eq(prPosts.id, id));
    revalidatePr();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}
