import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { submissions, auditLog, profiles } from '@/lib/db/schema';
import { createSignedUrl, getSubmissionsBucketName } from '@/lib/storage';

interface ConvertResult {
  success: true;
  google_doc_url: string;
}

interface ConvertError {
  success: false;
  error: string;
  status: number;
}

/**
 * Converts a submission's file to a Google Doc via Make.com webhook.
 * Saves the resulting Google Doc link to the submission record.
 */
export async function convertSubmissionToGDoc(
  submissionId: string,
  actorId: string
): Promise<ConvertResult | ConvertError> {
  const database = db();

  // Fetch submission
  const submissionResult = await database
    .select({
      id: submissions.id,
      title: submissions.title,
      file_url: submissions.file_url,
      file_name: submissions.file_name,
      owner_id: submissions.owner_id,
    })
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  const submission = submissionResult[0];

  if (!submission) {
    console.error('[Convert to GDoc] Submission not found:', submissionId);
    return { success: false, error: 'Submission not found', status: 404 };
  }

  if (!submission.file_url) {
    console.error('[Convert to GDoc] No file URL for submission:', submissionId);
    return { success: false, error: 'No file attached to submission', status: 400 };
  }

  // Get author information
  const authorResult = await database
    .select({ name: profiles.name, full_name: profiles.full_name, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, submission.owner_id))
    .limit(1);

  const authorProfile = authorResult[0];
  const authorName = authorProfile?.full_name || authorProfile?.name || authorProfile?.email || 'Unknown Author';

  // Create a signed URL for the file (valid for 1 hour)
  const signedUrl = await createSignedUrl(
    submission.file_url,
    60 * 60,
    getSubmissionsBucketName()
  );

  if (!signedUrl) {
    console.error('Failed to create signed URL for:', submission.file_url);
    return { success: false, error: 'Failed to create signed URL for file', status: 500 };
  }

  // Get Make webhook URL from environment
  const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
  if (!makeWebhookUrl) {
    return { success: false, error: 'Webhook not configured', status: 500 };
  }

  // Call Make webhook
  const webhookResponse = await fetch(makeWebhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submission_id: submission.id,
      file_url: signedUrl,
      file_name: submission.file_name || 'untitled',
      title: submission.title,
      author: authorName,
    }),
  });

  if (!webhookResponse.ok) {
    const errorText = await webhookResponse.text();
    console.error('Webhook failed:', webhookResponse.status, errorText);
    return { success: false, error: `Webhook failed: ${webhookResponse.statusText}`, status: 500 };
  }

  // Parse webhook response
  const webhookResult = await webhookResponse.json();

  if (!webhookResult.google_doc_id) {
    console.error('No google_doc_id in webhook response');
    return { success: false, error: 'Webhook did not return google_doc_id', status: 500 };
  }

  // Construct Google Doc URL and save to submission
  const google_doc_url = `https://docs.google.com/document/d/${webhookResult.google_doc_id}/edit`;

  await database
    .update(submissions)
    .set({ google_docs_link: google_doc_url })
    .where(eq(submissions.id, submissionId));

  console.log('[Convert to GDoc] Successfully converted and saved Google Doc link:', google_doc_url);

  // Log the action in audit trail
  await database.insert(auditLog).values({
    submission_id: submissionId,
    actor_id: actorId,
    action: 'convert_to_gdoc',
    details: {
      google_doc_id: webhookResult.google_doc_id,
      google_doc_url,
    },
  });

  return { success: true, google_doc_url };
}