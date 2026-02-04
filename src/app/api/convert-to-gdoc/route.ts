import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { submissions, auditLog, userRoles, profiles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { createSignedUrl, getSubmissionsBucketName } from '@/lib/storage';
import { hasCommitteeAccess } from '@/lib/auth/guards';

const convertRequestSchema = z.object({
  submission_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = convertRequestSchema.safeParse(body);

  if (!parsed.success) {
    console.error('[Convert to GDoc] Invalid request body:', parsed.error);
    return NextResponse.json({ error: 'Invalid request data.' }, { status: 400 });
  }

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const database = db();

  // Check if user has committee access
  const userRoleResult = await database
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const userRoleData = userRoleResult[0];

  if (!userRoleData || !userRoleData.is_member) {
    return NextResponse.json({ error: 'Forbidden - Committee access required' }, { status: 403 });
  }

  const positions = (userRoleData.positions as string[]) || [];
  const roles = (userRoleData.roles as string[]) || [];

  if (!hasCommitteeAccess(positions, roles)) {
    return NextResponse.json({ error: 'Forbidden - Committee access required' }, { status: 403 });
  }

  const { submission_id } = parsed.data;

  try {
    // Fetch submission from database
    const submissionResult = await database
      .select({
        id: submissions.id,
        title: submissions.title,
        file_url: submissions.file_url,
        file_name: submissions.file_name,
        owner_id: submissions.owner_id,
      })
      .from(submissions)
      .where(eq(submissions.id, submission_id))
      .limit(1);

    const submission = submissionResult[0];

    if (!submission) {
      console.error('[Convert to GDoc] Submission not found:', submission_id);
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (!submission.file_url) {
      console.error('[Convert to GDoc] No file URL for submission:', submission_id);
      return NextResponse.json({ error: 'No file attached to submission' }, { status: 400 });
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
      60 * 60, // 1 hour in seconds
      getSubmissionsBucketName()
    );

    if (!signedUrl) {
      console.error('Failed to create signed URL for:', submission.file_url);
      return NextResponse.json({ error: 'Failed to create signed URL for file' }, { status: 500 });
    }

    // Get Make webhook URL from environment
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!makeWebhookUrl) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Prepare webhook payload
    const webhookPayload = {
      submission_id: submission.id,
      file_url: signedUrl,
      file_name: submission.file_name || 'untitled',
      title: submission.title,
      author: authorName,
    };

    // Call Make webhook
    const webhookResponse = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook failed:', webhookResponse.status, errorText);
      return NextResponse.json(
        { error: `Webhook failed: ${webhookResponse.statusText}` },
        { status: 500 }
      );
    }

    // Parse webhook response
    const webhookResult = await webhookResponse.json();

    if (!webhookResult.google_doc_id) {
      console.error('No google_doc_id in webhook response');
      return NextResponse.json({ error: 'Webhook did not return google_doc_id' }, { status: 500 });
    }

    // Construct Google Doc URL
    const google_doc_url = `https://docs.google.com/document/d/${webhookResult.google_doc_id}/edit`;

    // Save google_docs_link to submission
    await database
      .update(submissions)
      .set({ google_docs_link: google_doc_url })
      .where(eq(submissions.id, submission_id));

    console.log('[Convert to GDoc] Successfully converted and saved Google Doc link:', google_doc_url);

    // Log the action in audit trail
    await database.insert(auditLog).values({
      submission_id,
      actor_id: profile.id,
      action: 'convert_to_gdoc',
      details: {
        google_doc_id: webhookResult.google_doc_id,
        google_doc_url,
      },
    });

    return NextResponse.json({
      success: true,
      google_doc_url,
    });
  } catch (error) {
    console.error('[Convert to GDoc] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
