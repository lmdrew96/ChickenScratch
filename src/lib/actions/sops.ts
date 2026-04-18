'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { sopArticles } from '@/lib/db/schema';
import { requireOfficerRole } from '@/lib/auth/guards';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function revalidateRoleSops(roleSlug: string) {
  revalidatePath(`/officers/toolkits/${roleSlug}`);
  revalidatePath(`/officers/toolkits/${roleSlug}/sops`);
  revalidatePath(`/officers/toolkits/${roleSlug}/sops/[sopSlug]`, 'page');
}

export async function createSopArticle(input: {
  role_slug: string;
  title: string;
  body_md?: string;
  tags?: string[];
  is_draft?: boolean;
}): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  try {
    const { profile } = await requireOfficerRole();
    if (!input.role_slug?.trim() || !input.title?.trim()) {
      return { ok: false, error: 'Role and title required' };
    }
    const baseSlug = slugify(input.title) || 'untitled';
    let slug = baseSlug;
    let suffix = 1;
    while (
      (await db()
        .select({ id: sopArticles.id })
        .from(sopArticles)
        .where(and(eq(sopArticles.role_slug, input.role_slug), eq(sopArticles.slug, slug)))
        .limit(1))[0]
    ) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }
    await db().insert(sopArticles).values({
      role_slug: input.role_slug,
      slug,
      title: input.title.trim(),
      body_md: input.body_md ?? '',
      tags: input.tags ?? [],
      is_draft: input.is_draft ?? false,
      updated_by: profile.id,
    });
    revalidateRoleSops(input.role_slug);
    return { ok: true, slug };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Create failed' };
  }
}

export async function updateSopArticle(input: {
  id: string;
  title?: string;
  body_md?: string;
  tags?: string[];
  is_draft?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const { profile } = await requireOfficerRole();
    const patch: Partial<typeof sopArticles.$inferInsert> = {
      updated_at: new Date(),
      updated_by: profile.id,
    };
    if (input.title !== undefined) patch.title = input.title.trim();
    if (input.body_md !== undefined) patch.body_md = input.body_md;
    if (input.tags !== undefined) patch.tags = input.tags;
    if (input.is_draft !== undefined) patch.is_draft = input.is_draft;

    const updated = await db()
      .update(sopArticles)
      .set(patch)
      .where(eq(sopArticles.id, input.id))
      .returning({ role_slug: sopArticles.role_slug });
    if (updated[0]) revalidateRoleSops(updated[0].role_slug);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Update failed' };
  }
}

export async function deleteSopArticle(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireOfficerRole();
    const removed = await db()
      .delete(sopArticles)
      .where(eq(sopArticles.id, id))
      .returning({ role_slug: sopArticles.role_slug });
    if (removed[0]) revalidateRoleSops(removed[0].role_slug);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}
