import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { submissions, auditLog } from '@/lib/db/schema';
import { requireProfile } from '@/lib/auth';
import { getCurrentUserRole } from '@/lib/actions/roles';

const publishSchema = z.object({
  volume: z.number().int().positive(),
  issueNumber: z.number().int().positive(),
  publishDate: z.string(),
});

/**
 * Extract body content from a full Google Docs /pub HTML page.
 * Strips <script> and <style> tags for safety.
 */
function extractGDocBody(html: string): string {
  // Extract content between <body> and </body>
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch?.[1] ?? html;

  // Strip <script> and <style> tags
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .trim();
}

/**
 * Fetch HTML export for a Google Doc via the built-in export URL.
 * No "Publish to the web" step required.
 */
async function fetchGDocHtml(googleDocsLink: string): Promise<string | null> {
  // Extract doc ID from URL like https://docs.google.com/document/d/{id}/edit
  const match = googleDocsLink.match(/\/document\/d\/([^/]+)/);
  if (!match) return null;

  const docId = match[1];
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=html`;

  try {
    const response = await fetch(exportUrl, { next: { revalidate: 0 } });
    if (!response.ok) return null;

    const html = await response.text();
    return extractGDocBody(html);
  } catch {
    return null;
  }
}

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

  const { profile } = await requireProfile();

  const userRole = await getCurrentUserRole();
  const isEditorInChief = userRole?.positions?.includes('Editor-in-Chief');

  if (!isEditorInChief) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const database = db();

  // Fetch the submission's google_docs_link for HTML conversion
  let publishedHtml: string | null = null;

  try {
    const [row] = await database
      .select({ google_docs_link: submissions.google_docs_link })
      .from(submissions)
      .where(eq(submissions.id, id))
      .limit(1);

    if (row?.google_docs_link) {
      publishedHtml = await fetchGDocHtml(row.google_docs_link);
    }
  } catch {
    // Non-fatal — we'll publish without HTML
  }

  const { volume, issueNumber, publishDate } = parsed.data;

  const updates = {
    published: true,
    status: 'published',
    volume,
    issue_number: issueNumber,
    publish_date: new Date(publishDate),
    published_html: publishedHtml,
    // Derive a human-readable issue string for backward compat
    issue: `Vol. ${volume}, No. ${issueNumber}`,
  };

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
    details: {
      volume,
      issue_number: issueNumber,
      publish_date: publishDate,
      has_published_html: publishedHtml !== null,
    },
  });

  revalidatePath('/editor');
  revalidatePath('/published');
  revalidatePath('/mine');
  return NextResponse.json({ success: true });
}
