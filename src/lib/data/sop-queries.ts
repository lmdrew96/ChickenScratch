import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { sopArticles } from '@/lib/db/schema';

export type SopArticleRow = {
  id: string;
  role_slug: string;
  slug: string;
  title: string;
  body_md: string;
  tags: string[] | null;
  is_draft: boolean;
  updated_at: Date;
  updated_by: string | null;
  created_at: Date;
};

export async function listSopsForRole(roleSlug: string): Promise<SopArticleRow[]> {
  const rows = await db()
    .select()
    .from(sopArticles)
    .where(eq(sopArticles.role_slug, roleSlug))
    .orderBy(desc(sopArticles.updated_at));
  return rows.map((r) => ({ ...r, tags: (r.tags as string[] | null) ?? [] }));
}

export async function getSopArticle(roleSlug: string, slug: string): Promise<SopArticleRow | null> {
  const rows = await db()
    .select()
    .from(sopArticles)
    .where(and(eq(sopArticles.role_slug, roleSlug), eq(sopArticles.slug, slug)))
    .limit(1);
  if (!rows[0]) return null;
  const r = rows[0];
  return { ...r, tags: (r.tags as string[] | null) ?? [] };
}
