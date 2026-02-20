import { z } from 'zod';
import { inArray, arrayContains, or } from 'drizzle-orm';

import { db } from '@/lib/db';
import { userRoles, profiles } from '@/lib/db/schema';
import { escapeHtml } from '@/lib/utils';

export const notificationSchema = z.object({
  submissionId: z.string().uuid(),
  committeeStatus: z.string().optional(),
  notificationType: z.enum(['new_submission', 'assignment']).optional(),
  submissionTitle: z.string(),
  submissionType: z.string(),
  submissionGenre: z.string().optional(),
  submissionDate: z.string().optional(),
  authorName: z.string().optional(),
});

export type NotificationPayload = z.infer<typeof notificationSchema>;

// Maps committee_status to the position that should be notified.
// For 'coordinator_approved', the target depends on submission type:
//   writing → Proofreader, visual → Lead Design
// The submissionType field in the payload resolves this at runtime.
const STATUS_TO_POSITION: Record<string, string | { writing: string; visual: string }> = {
  'coordinator_approved': { writing: 'Proofreader', visual: 'Lead Design' },
  'proofreader_committed': 'Lead Design',
  'lead_design_committed': 'Editor-in-Chief',
};

export type NotificationResult = {
  success: boolean;
  message: string;
  recipients?: string[];
  emailId?: string;
};

/**
 * Sends a submission notification email to the appropriate committee members.
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
  } = data;

  // Determine which position(s) should be notified
  let targetPositions: string[];

  if (notificationType === 'new_submission') {
    targetPositions = ['Submissions Coordinator', 'Editor-in-Chief'];
  } else if (committeeStatus && STATUS_TO_POSITION[committeeStatus]) {
    const mapping = STATUS_TO_POSITION[committeeStatus];
    if (typeof mapping === 'string') {
      targetPositions = [mapping];
    } else {
      // Type-dependent routing (e.g. coordinator_approved → Proofreader or Lead Design)
      targetPositions = [submissionType === 'writing' ? mapping.writing : mapping.visual];
    }
  } else {
    return { success: true, message: 'No notification required for this status' };
  }

  // Get users with any of the target positions
  const database = db();
  const roleRows = await database
    .select({ user_id: userRoles.user_id, positions: userRoles.positions })
    .from(userRoles)
    .where(
      or(...targetPositions.map((pos) => arrayContains(userRoles.positions, [pos])))
    );

  if (!roleRows || roleRows.length === 0) {
    console.warn('[Notification] No users found with positions:', targetPositions.join(', '));
    return { success: true, message: 'No users found with required position' };
  }

  // Fetch profiles for these users
  const roleUserIds = roleRows.map((r) => r.user_id);
  const profileRows = await database
    .select({ id: profiles.id, email: profiles.email, full_name: profiles.full_name })
    .from(profiles)
    .where(inArray(profiles.id, roleUserIds));

  const profileMap = new Map(profileRows.map((p) => [p.id, p]));

  // Extract emails
  const recipients = roleRows
    .map((role) => {
      const prof = profileMap.get(role.user_id);
      return prof?.email;
    })
    .filter((email): email is string => !!email);

  if (recipients.length === 0) {
    return { success: true, message: 'No valid email addresses found' };
  }

  const resendApiKey = process.env.RESEND_API_KEY;

  const isNewSubmission = notificationType === 'new_submission';
  const emailSubject = isNewSubmission
    ? `New Submission Received: ${submissionTitle}`
    : `New Submission Assigned: ${submissionTitle}`;

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
      ),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[Notification] Resend API error:', errorData);
    return { success: false, message: 'Failed to send email' };
  }

  const result = await response.json();
  return { success: true, message: 'Notification sent', recipients, emailId: result.id };
}

function generateEmailHtml(
  title: string,
  type: string,
  authorName: string | undefined,
  submissionId: string,
  genre: string | undefined,
  submissionDate: string | undefined,
  isNewSubmission: boolean,
): string {
  const committeeUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/committee`;
  const headerText = isNewSubmission ? 'New Submission Received' : 'New Submission Assigned';
  const bodyText = isNewSubmission
    ? 'A new submission has been received and is ready for your review.'
    : 'A new submission has been assigned to you for review.';

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
              <td style="padding: 8px 0;">${new Date(submissionDate).toLocaleDateString()}</td>
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
