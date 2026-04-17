import { z } from 'zod';
import { inArray, arrayOverlaps } from 'drizzle-orm';

import { db } from '@/lib/db';
import { userRoles, profiles } from '@/lib/db/schema';
import { escapeHtml } from '@/lib/utils';
import { logNotificationFailure } from '@/lib/email';

export const notificationSchema = z.object({
  submissionId: z.string().uuid(),
  committeeStatus: z.string().optional(),
  notificationType: z.enum(['new_submission', 'assignment']).optional(),
  submissionTitle: z.string(),
  submissionType: z.string(),
  submissionGenre: z.string().optional(),
  submissionDate: z.string().optional(),
  authorName: z.string().optional(),
  actorUserId: z.string().uuid().optional(),
});

export type NotificationPayload = z.infer<typeof notificationSchema>;

// Statuses that should trigger a notification to all committee members & officers.
const NOTIFIABLE_STATUSES = new Set([
  'with_coordinator',
  'coordinator_approved',
  'coordinator_declined',
  'proofreader_committed',
  'editor_approved',
  'editor_declined',
]);

export type NotificationResult = {
  success: boolean;
  message: string;
  recipients?: string[];
  emailId?: string;
};

/**
 * Map a notification event to the specific positions that should be notified.
 *
 * - New submission → Submissions Coordinators + Editor-in-Chief
 * - Coordinator approves → Proofreaders + Editor-in-Chief
 * - Proofreader commits → Editor-in-Chief
 * - All other statuses (declines, editor actions, etc.) → Editor-in-Chief only
 */
function getTargetPositions(
  notificationType?: string,
  committeeStatus?: string,
): string[] {
  if (notificationType === 'new_submission') {
    return ['Submissions Coordinator', 'Editor-in-Chief'];
  }

  switch (committeeStatus) {
    case 'coordinator_approved':
      return ['Proofreader', 'Editor-in-Chief'];
    case 'proofreader_committed':
      return ['Editor-in-Chief'];
    default:
      // Editor-in-Chief should always be in the loop for other transitions
      return ['Editor-in-Chief'];
  }
}

/**
 * Get email addresses for the committee members relevant to a specific
 * notification event, excluding the user who triggered the action.
 */
async function getTargetedRecipientEmails(
  notificationType?: string,
  committeeStatus?: string,
  excludeUserId?: string,
): Promise<string[]> {
  const database = db();
  const positions = getTargetPositions(notificationType, committeeStatus);

  const rows = await database
    .select({ user_id: userRoles.user_id })
    .from(userRoles)
    .where(arrayOverlaps(userRoles.positions, positions));

  const userIds = [...new Set(rows.map((r) => r.user_id))]
    .filter((id) => id !== excludeUserId);

  if (userIds.length === 0) return [];

  const profileRows = await database
    .select({ id: profiles.id, email: profiles.email })
    .from(profiles)
    .where(inArray(profiles.id, userIds));

  return profileRows
    .map((p) => p.email)
    .filter((email): email is string => !!email);
}

/**
 * Sends a submission notification email to all committee members and officers.
 * Can be called directly from server-side code — no HTTP request needed.
 */
export async function sendSubmissionNotification(
  data: NotificationPayload
): Promise<NotificationResult> {
  const {
    submissionId,
    committeeStatus,
    notificationType,
    submissionTitle,
    submissionType,
    submissionGenre,
    submissionDate,
    authorName,
    actorUserId,
  } = data;

  // Validate that a notification is warranted
  if (notificationType !== 'new_submission' && !(committeeStatus && NOTIFIABLE_STATUSES.has(committeeStatus))) {
    return { success: true, message: 'No notification required for this status' };
  }

  // Get only the committee members relevant to this event
  const recipients = await getTargetedRecipientEmails(notificationType, committeeStatus, actorUserId);

  if (recipients.length === 0) {
    return { success: true, message: 'No valid email addresses found' };
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  const isNewSubmission = notificationType === 'new_submission';
  const STATUS_SUBJECTS: Record<string, string> = {
    'with_coordinator': 'Under Review',
    'coordinator_approved': 'Approved by Coordinator',
    'coordinator_declined': 'Declined by Coordinator',
    'proofreader_committed': 'Proofreader Committed',
    'editor_approved': 'Approved by Editor-in-Chief',
    'editor_declined': 'Declined by Editor-in-Chief',
  };
  const emailSubject = isNewSubmission
    ? `New Submission Received: ${submissionTitle}`
    : `Submission ${STATUS_SUBJECTS[committeeStatus!] || 'Updated'}: ${submissionTitle}`;

  if (!resendApiKey) {
    return { success: true, message: 'Email logged (Resend not configured)', recipients };
  }

  // Send email via Resend
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Chicken Scratch <notifications@chickenscratch.me>',
      to: recipients,
      subject: emailSubject,
      html: generateEmailHtml(
        submissionTitle,
        submissionType,
        authorName,
        submissionId,
        submissionGenre,
        submissionDate,
        isNewSubmission,
        committeeStatus,
      ),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[Notification] Resend API error:', errorData);
    await logNotificationFailure({
      type: 'committee',
      recipient: recipients.join(', '),
      subject: emailSubject,
      errorMessage: JSON.stringify(errorData),
      context: { submissionId, submissionTitle, committeeStatus, notificationType },
    });
    return { success: false, message: 'Failed to send email' };
  }

  const result = await response.json();
  return { success: true, message: 'Notification sent', recipients, emailId: result.id };
}

const STATUS_LABELS: Record<string, { header: string; body: string }> = {
  'with_coordinator': {
    header: 'Submission Under Review',
    body: 'A submission is now being reviewed by the Submissions Coordinator.',
  },
  'coordinator_approved': {
    header: 'Submission Approved by Coordinator',
    body: 'A submission has been approved by the Submissions Coordinator and is ready for the next step.',
  },
  'coordinator_declined': {
    header: 'Submission Declined by Coordinator',
    body: 'A submission has been declined by the Submissions Coordinator.',
  },
  'proofreader_committed': {
    header: 'Proofreader Has Committed',
    body: 'The proofreader has committed their work on a submission.',
  },
  'editor_approved': {
    header: 'Submission Approved by Editor-in-Chief',
    body: 'A submission has received final approval from the Editor-in-Chief.',
  },
  'editor_declined': {
    header: 'Submission Declined by Editor-in-Chief',
    body: 'A submission has been declined by the Editor-in-Chief.',
  },
};

function generateEmailHtml(
  title: string,
  type: string,
  authorName: string | undefined,
  submissionId: string,
  genre: string | undefined,
  submissionDate: string | undefined,
  isNewSubmission: boolean,
  committeeStatus?: string,
): string {
  const committeeUrl = 'https://chickenscratch.me/committee';

  let headerText: string;
  let bodyText: string;

  if (isNewSubmission) {
    headerText = 'New Submission Received';
    bodyText = 'A new submission has been received and is ready for review.';
  } else if (committeeStatus && STATUS_LABELS[committeeStatus]) {
    headerText = STATUS_LABELS[committeeStatus].header;
    bodyText = STATUS_LABELS[committeeStatus].body;
  } else {
    headerText = 'Submission Updated';
    bodyText = 'A submission has been updated.';
  }

  const safeTitle = escapeHtml(title);
  const safeType = escapeHtml(type);
  const safeGenre = genre ? escapeHtml(genre) : null;
  const safeAuthorName = authorName ? escapeHtml(authorName) : null;
  const safeSubmissionId = escapeHtml(submissionId);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${headerText}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <h1 style="color: #2c3e50; margin-top: 0;">${headerText}</h1>
          <p style="font-size: 16px; color: #555;">
            ${bodyText}
          </p>
        </div>

        <div style="background-color: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #2c3e50; margin-top: 0; font-size: 18px;">Submission Details</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Title:</td>
              <td style="padding: 8px 0;">${safeTitle}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Type:</td>
              <td style="padding: 8px 0;">${safeType}</td>
            </tr>
            ${safeGenre ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Genre:</td>
              <td style="padding: 8px 0;">${safeGenre}</td>
            </tr>
            ` : ''}
            ${safeAuthorName ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Author:</td>
              <td style="padding: 8px 0;">${safeAuthorName}</td>
            </tr>
            ` : ''}
            ${submissionDate ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Submitted:</td>
              <td style="padding: 8px 0;">${new Date(submissionDate).toLocaleDateString('en-US', { timeZone: 'America/New_York' })}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #555;">Submission ID:</td>
              <td style="padding: 8px 0; font-family: monospace; font-size: 12px;">${safeSubmissionId}</td>
            </tr>
          </table>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${committeeUrl}"
             style="display: inline-block; background-color: #007bff; color: #fff; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: bold; font-size: 16px;">
            View in Committee Dashboard
          </a>
        </div>

        <div style="border-top: 1px solid #e0e0e0; padding-top: 20px; margin-top: 30px; font-size: 14px; color: #777;">
          <p>
            This is an automated notification from Chicken Scratch.
            Please log in to the committee dashboard to review and take action on this submission.
          </p>
          <p style="margin-bottom: 0;">
            <strong>Chicken Scratch</strong><br>
            Hen & Ink Society
          </p>
        </div>
      </body>
    </html>
  `;
}
