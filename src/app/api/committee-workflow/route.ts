import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';
import { isCommitteeRole } from '@/lib/auth/guards';
import type { Database, Json } from '@/types/database';

const workflowActionSchema = z.object({
  submissionId: z.string().uuid(),
  action: z.enum(['approve', 'decline', 'commit', 'assign']),
  comment: z.string().optional(),
  linkUrl: z.string().url().optional(),
  assigneeId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = workflowActionSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid workflow action data.' }, { status: 400 });
  }

  const supabase = await createSupabaseRouteHandlerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's profile and role
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profileData || !profileData.role || !isCommitteeRole(profileData.role)) {
    return NextResponse.json({ error: 'Forbidden - Committee access required' }, { status: 403 });
  }

  const userRole = profileData.role;
  const { submissionId, action, comment, linkUrl, assigneeId } = parsed.data;

  try {
    // Get current submission state
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (fetchError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Process action based on user role and action type
    let updatePayload: Database['public']['Tables']['submissions']['Update'] = {};
    let newStatus: string | null = null;
    let auditAction = action;

    switch (userRole) {
      case 'submissions_coordinator':
        if (action === 'approve') {
          if (submission.type === 'writing') {
            newStatus = 'with_proofreader';
          } else {
            newStatus = 'with_lead_design';
          }
          updatePayload.committee_status = newStatus as any;
          updatePayload.coordinator_reviewed_at = new Date().toISOString();
        } else if (action === 'decline') {
          newStatus = 'coordinator_declined';
          updatePayload.committee_status = newStatus as any;
          updatePayload.decline_reason = comment;
          updatePayload.coordinator_reviewed_at = new Date().toISOString();
        }
        break;

      case 'proofreader':
        if (action === 'commit' && linkUrl) {
          updatePayload.google_docs_link = linkUrl;
          updatePayload.committee_status = 'proofreader_committed';
          updatePayload.proofreader_committed_at = new Date().toISOString();
        }
        break;

      case 'lead_design':
        if (action === 'commit' && linkUrl) {
          updatePayload.lead_design_commit_link = linkUrl;
          updatePayload.committee_status = 'lead_design_committed';
          updatePayload.lead_design_committed_at = new Date().toISOString();
        }
        break;

      case 'editor_in_chief':
        if (action === 'approve') {
          updatePayload.committee_status = 'editor_approved';
          updatePayload.editor_reviewed_at = new Date().toISOString();
        } else if (action === 'decline') {
          updatePayload.committee_status = 'editor_declined';
          updatePayload.decline_reason = comment;
          updatePayload.editor_reviewed_at = new Date().toISOString();
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid role for this action' }, { status: 403 });
    }

    // Add comment to committee_comments array if provided
    if (comment) {
      const existingComments = (submission.committee_comments as any[]) || [];
      const newComment = {
        id: crypto.randomUUID(),
        userId: user.id,
        userRole,
        comment,
        timestamp: new Date().toISOString(),
        action
      };
      updatePayload.committee_comments = [...existingComments, newComment] as Json;
    }

    // Update the submission
    const { error: updateError } = await supabase
      .from('submissions')
      .update(updatePayload)
      .eq('id', submissionId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    // Log the action in audit trail
    const auditDetails: Json = {
      action,
      previousStatus: submission.committee_status,
      newStatus,
      comment,
      linkUrl,
      assigneeId,
      userRole
    };

    await supabase.from('audit_log').insert({
      submission_id: submissionId,
      actor_id: user.id,
      action: `committee_${auditAction}`,
      details: auditDetails,
    });

    revalidatePath('/committee');
    return NextResponse.json({ success: true, newStatus });

  } catch (error) {
    console.error('Committee workflow error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
