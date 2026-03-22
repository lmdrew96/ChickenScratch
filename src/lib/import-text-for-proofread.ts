import { eq } from 'drizzle-orm';
import mammoth from 'mammoth';

import { db } from '@/lib/db';
import { submissions, auditLog } from '@/lib/db/schema';
import { createSignedUrl, getSubmissionsBucketName } from '@/lib/storage';

/**
 * Convert plain text to simple HTML paragraphs.
 * Splits on blank lines; preserves single line breaks within paragraphs.
 */
function plainTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br />')}</p>`)
    .join('\n');
}

/**
 * Import a submission's file content into `proofread_html` for in-app editing.
 * Supports .docx/.doc (via mammoth) and .txt (via plain-text-to-HTML conversion).
 * PDFs and unsupported types return null — the proofreader types manually.
 *
 * Idempotent: if `proofread_html` is already set, returns it without re-importing.
 */
export async function importTextForProofread(
  submissionId: string,
  actorId: string
): Promise<{ html: string | null }> {
  const database = db();

  const rows = await database
    .select({
      id: submissions.id,
      file_url: submissions.file_url,
      file_name: submissions.file_name,
      file_type: submissions.file_type,
      text_body: submissions.text_body,
      proofread_html: submissions.proofread_html,
    })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  const submission = rows[0];
  if (!submission) return { html: null };

  // Already imported — idempotent
  if (submission.proofread_html) return { html: submission.proofread_html };

  let html: string | null = null;

  const fileType = submission.file_type?.toLowerCase() ?? '';
  const fileName = submission.file_name?.toLowerCase() ?? '';
  const isDocx =
    fileType.includes('wordprocessingml') ||
    fileType.includes('msword') ||
    fileName.endsWith('.docx') ||
    fileName.endsWith('.doc');
  const isTxt = fileType.includes('text/plain') || fileName.endsWith('.txt');

  if (submission.file_url && (isDocx || isTxt)) {
    // Get a short-lived signed URL to download the file
    const signedUrl = await createSignedUrl(
      submission.file_url,
      60,
      getSubmissionsBucketName()
    );

    if (signedUrl) {
      try {
        const response = await fetch(signedUrl);
        if (response.ok) {
          if (isDocx) {
            const buffer = Buffer.from(await response.arrayBuffer());
            const result = await mammoth.convertToHtml({ buffer });
            html = result.value || null;
          } else {
            // .txt
            const text = await response.text();
            html = text.trim() ? plainTextToHtml(text.trim()) : null;
          }
        }
      } catch (err) {
        console.warn('[importTextForProofread] File download/conversion failed:', err);
      }
    }
  }

  // Fall back to text_body if file import didn't produce anything
  if (!html && submission.text_body?.trim()) {
    html = plainTextToHtml(submission.text_body.trim());
  }

  // Save to DB (even if null — marks that import was attempted)
  if (html) {
    await database
      .update(submissions)
      .set({ proofread_html: html })
      .where(eq(submissions.id, submissionId));

    await database.insert(auditLog).values({
      submission_id: submissionId,
      actor_id: actorId,
      action: 'import_text_for_proofread',
      details: { file_name: submission.file_name, file_type: submission.file_type },
    });
  }

  return { html };
}
