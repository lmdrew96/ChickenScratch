import { NextResponse, type NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { submissions, userRoles, profiles, auditLog } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { hasCommitteeAccess, hasOfficerAccess } from '@/lib/auth/guards';
import { sendSubmissionNotification } from '@/lib/notifications';
import { sendSubmissionEmail } from '@/lib/email';
import { convertSubmissionToGDoc } from '@/lib/convert-to-gdoc';
import type { NewSubmission } from '@/types/database';

const workflowActionSchema = z.object({
  submissionId: z.string().uuid(),
  action: z.enum(['review', 'approve', 'decline', 'commit', 'assign', 'final_approve', 'final_decline', 'request_changes']),
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
  const database = db();

  // Get user's roles from user_roles table
  const userRoleRows = await database
    .select()
    .from(userRoles)
    .where(eq(userRoles.user_id, profile.id))
    .limit(1);

  const userRoleData = userRoleRows[0] ?? null;

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
    const submissionRows = await database
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);

    const submission = submissionRows[0];

    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Process action based on user role and action type
    const updatePayload: Partial<NewSubmission> = {};
    let newStatus: string | null = null;
    const auditAction = action;

    switch (userRole) {
      case 'submissions_coordinator':
        if (action === 'review') {
          // Context-aware review action based on current status
          if (!submission.committee_status || submission.committee_status === 'pending_coordinator') {
            // New Submissions → Under Review (status change only)
            newStatus = 'with_coordinator';
            updatePayload.committee_status = newStatus;
          } else if (submission.committee_status === 'with_coordinator') {
            // Under Review → Trigger Make webhook for file conversion
            const convertResult = await convertSubmissionToGDoc(submissionId, profile.id);

            if (!convertResult.success) {
              return NextResponse.json(
                { error: convertResult.error },
                { status: convertResult.status }
              );
            }

            revalidatePath('/committee');
            return NextResponse.json({
              success: true,
              google_doc_url: convertResult.google_doc_url,
            });
          }
        } else if (action === 'approve') {
          // Move to "Approved" column and route to next step
          newStatus = 'coordinator_approved';
          updatePayload.committee_status = newStatus;
          updatePayload.coordinator_reviewed_at = new Date();
        } else if (action === 'decline') {
          newStatus = 'coordinator_declined';
          updatePayload.committee_status = newStatus;
          updatePayload.decline_reason = comment;
          updatePayload.coordinator_reviewed_at = new Date();
        } else if (action === 'request_changes') {
          newStatus = 'changes_requested';
          updatePayload.committee_status = newStatus;
          updatePayload.status = 'needs_revision';
          updatePayload.editor_notes = comment || null;
        }
        break;

      case 'proofreader':
        if (action === 'commit' && linkUrl) {
          newStatus = 'proofreader_committed';
          updatePayload.google_docs_link = linkUrl;
          updatePayload.committee_status = newStatus;
          updatePayload.proofreader_committed_at = new Date();
        }
        break;

      case 'lead_design':
        if (action === 'commit' && linkUrl) {
          newStatus = 'lead_design_committed';
          updatePayload.lead_design_commit_link = linkUrl;
          updatePayload.committee_status = newStatus;
          updatePayload.lead_design_committed_at = new Date();
        }
        break;

      case 'editor_in_chief':
        if (action === 'approve' || action === 'final_approve') {
          newStatus = 'editor_approved';
          updatePayload.committee_status = newStatus;
          updatePayload.editor_reviewed_at = new Date();
        } else if (action === 'decline' || action === 'final_decline') {
          newStatus = 'editor_declined';
          updatePayload.committee_status = newStatus;
          updatePayload.decline_reason = comment;
          updatePayload.editor_reviewed_at = new Date();
        } else if (action === 'request_changes') {
          newStatus = 'changes_requested';
          updatePayload.committee_status = newStatus;
          updatePayload.status = 'needs_revision';
          updatePayload.editor_notes = comment || null;
          updatePayload.editor_reviewed_at = new Date();
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
      updatePayload.committee_comments = [...existingComments, newComment];
    }

    // Update the submission
    await database
      .update(submissions)
      .set(updatePayload)
      .where(eq(submissions.id, submissionId));

    // Send notification when a submission transitions to a new role's responsibility
    if (newStatus && ['coordinator_approved', 'proofreader_committed', 'lead_design_committed'].includes(newStatus)) {
      try {
        const authorRows = await database
          .select({ full_name: profiles.full_name, email: profiles.email })
          .from(profiles)
          .where(eq(profiles.id, submission.owner_id))
          .limit(1);

        const authorProfile = authorRows[0];

        await sendSubmissionNotification({
          submissionId,
          committeeStatus: newStatus,
          submissionTitle: submission.title,
          submissionType: submission.type,
          authorName: authorProfile?.full_name || authorProfile?.email || 'Unknown',
        });
      } catch {
        // Notification failure should not block the workflow
      }
    }

    // Send author email when changes are requested
    if (newStatus === 'changes_requested') {
      try {
        const authorRows = await database
          .select({ email: profiles.email })
          .from(profiles)
          .where(eq(profiles.id, submission.owner_id))
          .limit(1);

        const authorEmail = authorRows[0]?.email;
        if (authorEmail) {
          await sendSubmissionEmail({
            template: 'needs_revision',
            to: authorEmail,
            submission: { id: submission.id, title: submission.title },
            editorNotes: comment,
          });
        }
      } catch {
        // Email failure should not block the workflow
      }
    }

    // Log the action in audit trail
    const auditDetails = {
      action,
      previousStatus: submission.committee_status,
      newStatus,
      comment,
      linkUrl,
      assigneeId,
      userRole
    };

    await database.insert(auditLog).values({
      submission_id: submissionId,
      actor_id: profile.id,
      action: `committee_${auditAction}`,
      details: auditDetails,
    });

    revalidatePath('/committee');
    return NextResponse.json({ success: true, newStatus });

  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
