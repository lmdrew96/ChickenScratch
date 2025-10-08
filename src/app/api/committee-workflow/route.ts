import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { createSupabaseRouteHandlerClient } from '@/lib/supabase/route';
import { hasCommitteeAccess, hasOfficerAccess } from '@/lib/auth/guards';
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

  // Get user's roles from user_roles table
  const { data: userRoleData } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  // Check if user has committee or officer access
  if (!userRoleData || !userRoleData.is_member) {
    return NextResponse.json({ error: 'Forbidden - Committee access required' }, { status: 403 });
  }

  const positions = userRoleData.positions || [];
  const roles = userRoleData.roles || [];

  // Officers have access to everything, committee members have access to committee workflow
  if (!hasOfficerAccess(positions, roles) && !hasCommitteeAccess(positions, roles)) {
    return NextResponse.json({ error: 'Forbidden - Committee access required' }, { status: 403 });
  }

  // Determine the user's primary position for workflow logic
  let userRole: string | null = null;
  if (positions.includes('Submissions Coordinator')) {
    userRole = 'submissions_coordinator';
  } else if (positions.includes('Proofreader')) {
    userRole = 'proofreader';
  } else if (positions.includes('Lead Design')) {
    userRole = 'lead_design';
  } else if (positions.includes('Editor-in-Chief')) {
    userRole = 'editor_in_chief';
  } else if (hasOfficerAccess(positions, roles)) {
    // Officers can perform any action, default to editor role
    userRole = 'editor_in_chief';
  }

  if (!userRole) {
    return NextResponse.json({ error: 'Forbidden - No valid committee position' }, { status: 403 });
  }
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
    const updatePayload: Database['public']['Tables']['submissions']['Update'] = {};
    let newStatus: string | null = null;
    const auditAction = action;

    switch (userRole) {
      case 'submissions_coordinator':
        if (action === 'approve') {
          if (submission.type === 'writing') {
            newStatus = 'with_proofreader';
          } else {
            newStatus = 'with_lead_design';
          }
          updatePayload.committee_status = newStatus as Database['public']['Tables']['submissions']['Row']['committee_status'];
          updatePayload.coordinator_reviewed_at = new Date().toISOString();
        } else if (action === 'decline') {
          newStatus = 'coordinator_declined';
          updatePayload.committee_status = newStatus as Database['public']['Tables']['submissions']['Row']['committee_status'];
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
      const existingComments = (submission.committee_comments as Array<Record<string, unknown>>) || [];
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
