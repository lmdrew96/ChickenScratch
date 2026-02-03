import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/supabase/db';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess } from '@/lib/auth/guards';
import type { Database, Json } from '@/types/database';

const workflowActionSchema = z.object({
  submissionId: z.string().uuid(),
  action: z.enum(['review', 'approve', 'decline', 'commit', 'assign']),
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

  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const profile = await ensureProfile(userId);
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = db();

  // Get user's roles from user_roles table
  const { data: userRoleData } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', profile.id)
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
        if (action === 'review') {
          // Context-aware review action based on current status
          if (!submission.committee_status || submission.committee_status === 'pending_coordinator') {
            // New Submissions → Under Review (status change only)
            newStatus = 'with_coordinator';
            updatePayload.committee_status = newStatus as Database['public']['Tables']['submissions']['Row']['committee_status'];
            console.log('[Committee Workflow] Review action (new submission) - setting status to:', newStatus);
          } else if (submission.committee_status === 'with_coordinator') {
            // Under Review → Trigger Make webhook for file conversion
            console.log('[Committee Workflow] Review action (under review) - triggering Make webhook for file conversion');

            try {
              // Call the convert-to-gdoc endpoint
              const convertResponse = await fetch(`${request.nextUrl.origin}/api/convert-to-gdoc`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ submission_id: submissionId }),
              });

              if (!convertResponse.ok) {
                const errorData = await convertResponse.json();
                console.error('[Committee Workflow] Convert to GDoc failed:', errorData);
                return NextResponse.json(
                  { error: errorData.error || 'Failed to convert file to Google Doc' },
                  { status: convertResponse.status }
                );
              }

              const convertResult = await convertResponse.json();
              console.log('[Committee Workflow] Successfully converted to Google Doc:', convertResult.google_doc_url);

              // Return the Google Doc URL so frontend can open it
              revalidatePath('/committee');
              return NextResponse.json({
                success: true,
                google_doc_url: convertResult.google_doc_url
              });
            } catch (error) {
              console.error('[Committee Workflow] Error calling convert-to-gdoc:', error);
              return NextResponse.json(
                { error: 'Failed to convert file to Google Doc' },
                { status: 500 }
              );
            }
          }
        } else if (action === 'approve') {
          // Move to "Approved" column and route to next step
          newStatus = 'coordinator_approved';
          updatePayload.committee_status = newStatus as Database['public']['Tables']['submissions']['Row']['committee_status'];
          updatePayload.coordinator_reviewed_at = new Date().toISOString();
          console.log('[Committee Workflow] Approve action - setting status to:', newStatus, 'for submission type:', submission.type);
        } else if (action === 'decline') {
          newStatus = 'coordinator_declined';
          updatePayload.committee_status = newStatus as Database['public']['Tables']['submissions']['Row']['committee_status'];
          updatePayload.decline_reason = comment;
          updatePayload.coordinator_reviewed_at = new Date().toISOString();
          console.log('[Committee Workflow] Decline action - setting status to:', newStatus);
        }
        break;

      case 'proofreader':
        if (action === 'commit' && linkUrl) {
          updatePayload.google_docs_link = linkUrl;
          updatePayload.committee_status = 'proofreader_committed';
          updatePayload.proofreader_committed_at = new Date().toISOString();
          console.log('[Committee Workflow] Proofreader commit - setting status to: proofreader_committed');
        }
        break;

      case 'lead_design':
        if (action === 'commit' && linkUrl) {
          updatePayload.lead_design_commit_link = linkUrl;
          updatePayload.committee_status = 'lead_design_committed';
          updatePayload.lead_design_committed_at = new Date().toISOString();
          console.log('[Committee Workflow] Lead Design commit - setting status to: lead_design_committed');
        }
        break;

      case 'editor_in_chief':
        if (action === 'approve') {
          updatePayload.committee_status = 'editor_approved';
          updatePayload.editor_reviewed_at = new Date().toISOString();
          console.log('[Committee Workflow] Editor approve - setting status to: editor_approved');
        } else if (action === 'decline') {
          // Special handling: EIC decline overrides all other statuses and moves directly to editor_declined
          updatePayload.committee_status = 'editor_declined';
          updatePayload.decline_reason = comment;
          updatePayload.editor_reviewed_at = new Date().toISOString();
          console.log('[Committee Workflow] Editor-in-Chief decline - setting status to: editor_declined (overrides current stage)');
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
        userId: profile.id,
        userRole,
        comment,
        timestamp: new Date().toISOString(),
        action
      };
      updatePayload.committee_comments = [...existingComments, newComment] as Json;
    }

    // Update the submission
    console.log('[Committee Workflow] Updating submission:', submissionId, 'with payload:', updatePayload);
    const { error: updateError } = await supabase
      .from('submissions')
      .update(updatePayload)
      .eq('id', submissionId);

    if (updateError) {
      console.error('[Committee Workflow] Update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    console.log('[Committee Workflow] Successfully updated submission to status:', newStatus);

    // Send notification if status changed to a committee member assignment
    if (newStatus && ['with_proofreader', 'with_lead_design', 'with_editor_in_chief'].includes(newStatus)) {
      console.log('[Committee Workflow] Triggering notification for status:', newStatus);

      try {
        // Fetch author name from profiles
        const { data: authorProfile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', submission.owner_id)
          .single();

        const notificationResponse = await fetch(`${request.nextUrl.origin}/api/notifications/submission-assigned`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            submissionId,
            committeeStatus: newStatus,
            submissionTitle: submission.title,
            submissionType: submission.type,
            authorName: authorProfile?.full_name || authorProfile?.email || 'Unknown',
          }),
        });

        if (!notificationResponse.ok) {
          const errorData = await notificationResponse.json();
          console.error('[Committee Workflow] Notification failed:', errorData);
        } else {
          const notificationResult = await notificationResponse.json();
          console.log('[Committee Workflow] Notification sent:', notificationResult);
        }
      } catch (notificationError) {
        console.error('[Committee Workflow] Error sending notification:', notificationError);
      }
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
      actor_id: profile.id,
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
