import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';
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

  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user has committee access
  const { data: userRoleData } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!userRoleData || !userRoleData.is_member) {
    return NextResponse.json({ error: 'Forbidden - Committee access required' }, { status: 403 });
  }

  const positions = userRoleData.positions || [];
  const roles = userRoleData.roles || [];

  if (!hasCommitteeAccess(positions, roles)) {
    return NextResponse.json({ error: 'Forbidden - Committee access required' }, { status: 403 });
  }

  const { submission_id } = parsed.data;

  try {
    // Fetch submission from database
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('id, title, file_url, file_name, owner_id')
      .eq('id', submission_id)
      .single();

    if (fetchError || !submission) {
      console.error('[Convert to GDoc] Submission not found:', submission_id, fetchError);
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    if (!submission.file_url) {
      console.error('[Convert to GDoc] No file URL for submission:', submission_id);
      return NextResponse.json({ error: 'No file attached to submission' }, { status: 400 });
    }

    // Get author information
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('name, full_name, email')
      .eq('id', submission.owner_id)
      .single();

    const authorName = authorProfile?.full_name || authorProfile?.name || authorProfile?.email || 'Unknown Author';

    // Create a signed URL for the file (valid for 1 hour)
    const signedUrl = await createSignedUrl(
      submission.file_url,
      60 * 60, // 1 hour in seconds
      getSubmissionsBucketName()
    );

    if (!signedUrl) {
      console.error('[Convert to GDoc] Failed to create signed URL for:', submission.file_url);
      return NextResponse.json({ error: 'Failed to create signed URL for file' }, { status: 500 });
    }

    console.log('[Convert to GDoc] Created signed URL for submission:', submission_id);

    // Get Make webhook URL from environment
    const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
    if (!makeWebhookUrl) {
      console.error('[Convert to GDoc] MAKE_WEBHOOK_URL not configured');
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

    console.log('[Convert to GDoc] Calling Make webhook with payload:', {
      ...webhookPayload,
      file_url: '[SIGNED_URL]', // Don't log the full signed URL
    });

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
      console.error('[Convert to GDoc] Webhook failed:', webhookResponse.status, errorText);
      return NextResponse.json(
        { error: `Webhook failed: ${webhookResponse.statusText}` },
        { status: 500 }
      );
    }

    // Parse webhook response
    const webhookResult = await webhookResponse.json();
    console.log('[Convert to GDoc] Webhook response:', webhookResult);

    if (!webhookResult.google_doc_id) {
      console.error('[Convert to GDoc] No google_doc_id in webhook response:', webhookResult);
      return NextResponse.json({ error: 'Webhook did not return google_doc_id' }, { status: 500 });
    }

    // Construct Google Doc URL
    const google_doc_url = `https://docs.google.com/document/d/${webhookResult.google_doc_id}/edit`;

    // Save google_docs_link to submission
    const { error: updateError } = await supabase
      .from('submissions')
      .update({ google_docs_link: google_doc_url })
      .eq('id', submission_id);

    if (updateError) {
      console.error('[Convert to GDoc] Failed to update submission:', updateError);
      return NextResponse.json({ error: 'Failed to save Google Doc link' }, { status: 500 });
    }

    console.log('[Convert to GDoc] Successfully converted and saved Google Doc link:', google_doc_url);

    // Log the action in audit trail
    await supabase.from('audit_log').insert({
      submission_id,
      actor_id: user.id,
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
