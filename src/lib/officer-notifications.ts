import { arrayContains, arrayOverlaps, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { userRoles, profiles } from '@/lib/db/schema';
import { OFFICER_POSITIONS } from '@/lib/auth/guards';
import { escapeHtml } from '@/lib/utils';

const BRAND_BLUE = '#00539f';
const ACCENT_GOLD = '#ffd200';
const CTA_TEXT = '#003b72';

/**
 * Get email addresses for all officers, optionally excluding a specific user.
 */
async function getOfficerEmails(excludeUserId?: string): Promise<string[]> {
  const database = db();

  const roleRows = await database
    .select({ user_id: userRoles.user_id })
    .from(userRoles)
    .where(arrayContains(userRoles.roles, ['officer']));

  const positionRows = await database
    .select({ user_id: userRoles.user_id })
    .from(userRoles)
    .where(arrayOverlaps(userRoles.positions, [...OFFICER_POSITIONS]));

  const officerUserIds = [...new Set([
    ...roleRows.map((r) => r.user_id),
    ...positionRows.map((r) => r.user_id),
  ])].filter((id) => id !== excludeUserId);

  if (officerUserIds.length === 0) return [];

  const profileRows = await database
    .select({ id: profiles.id, email: profiles.email })
    .from(profiles)
    .where(inArray(profiles.id, officerUserIds));

  return profileRows
    .map((p) => p.email)
    .filter((email): email is string => !!email);
}

type OfficerEmailResult = {
  success: boolean;
  recipients?: string[];
};

/**
 * Send an email to all officers when an announcement is posted.
 */
export async function notifyOfficersOfAnnouncement(
  message: string,
  authorName: string,
  excludeUserId?: string,
): Promise<OfficerEmailResult> {
  const recipients = await getOfficerEmails(excludeUserId);
  if (recipients.length === 0) return { success: true };

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.info('[officer-email] announcement notification (Resend not configured)', { recipients });
    return { success: true, recipients };
  }

  const html = generateAnnouncementEmail(message, authorName);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Chicken Scratch <notifications@chickenscratch.me>',
      to: recipients,
      subject: `New Officer Announcement — Chicken Scratch`,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[officer-email] Resend API error:', errorData);
    return { success: false };
  }

  return { success: true, recipients };
}

/**
 * Send an email to all officers when a meeting proposal is created.
 */
export async function notifyOfficersOfMeeting(
  title: string,
  description: string | null,
  proposedDates: string[],
  authorName: string,
  excludeUserId?: string,
): Promise<OfficerEmailResult> {
  const recipients = await getOfficerEmails(excludeUserId);
  if (recipients.length === 0) return { success: true };

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.info('[officer-email] meeting notification (Resend not configured)', { recipients });
    return { success: true, recipients };
  }

  const html = generateMeetingEmail(title, description, proposedDates, authorName);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Chicken Scratch <notifications@chickenscratch.me>',
      to: recipients,
      subject: `New Meeting Proposal: ${title} — Chicken Scratch`,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[officer-email] Resend API error:', errorData);
    return { success: false };
  }

  return { success: true, recipients };
}

// ---------------------------------------------------------------------------
// HTML templates
// ---------------------------------------------------------------------------

function generateAnnouncementEmail(message: string, authorName: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const logoUrl = `${siteUrl}/logo.png`;
  const officersUrl = `${siteUrl}/officers`;
  const safeMessage = escapeHtml(message);
  const safeAuthor = escapeHtml(authorName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Officer Announcement</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: Arial, Helvetica, sans-serif; color: #333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND_BLUE}; padding: 32px 24px; text-align: center;">
              <img src="${logoUrl}" alt="Chicken Scratch" width="80" height="80" style="display: block; margin: 0 auto 16px; border-radius: 50%;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">New Officer Announcement</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888;">
                Posted by ${safeAuthor}
              </p>

              <div style="margin: 16px 0; padding: 16px 20px; background-color: #f8f9fa; border-left: 4px solid ${ACCENT_GOLD}; border-radius: 4px;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #333; white-space: pre-wrap;">${safeMessage}</p>
              </div>

              <!-- CTA -->
              <div style="text-align: center; margin: 32px 0 8px;">
                <a href="${officersUrl}" style="display: inline-block; background-color: ${ACCENT_GOLD}; color: ${CTA_TEXT}; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 700; font-size: 15px;">
                  View Officer Dashboard
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${BRAND_BLUE}; padding: 20px 24px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.7);">
                <strong style="color: #ffffff;">Chicken Scratch</strong> &mdash; Hen &amp; Ink Society
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: rgba(255,255,255,0.5);">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function generateMeetingEmail(
  title: string,
  description: string | null,
  proposedDates: string[],
  authorName: string,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const logoUrl = `${siteUrl}/logo.png`;
  const officersUrl = `${siteUrl}/officers`;
  const safeTitle = escapeHtml(title);
  const safeAuthor = escapeHtml(authorName);
  const safeDescription = description ? escapeHtml(description) : null;

  const dateRows = proposedDates
    .map((d) => {
      const date = new Date(d);
      const formatted = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
      return `<li style="padding: 6px 0; font-size: 15px; color: #333;">${escapeHtml(formatted)}</li>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Meeting Proposal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: Arial, Helvetica, sans-serif; color: #333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND_BLUE}; padding: 32px 24px; text-align: center;">
              <img src="${logoUrl}" alt="Chicken Scratch" width="80" height="80" style="display: block; margin: 0 auto 16px; border-radius: 50%;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">New Meeting Proposal</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #888;">
                Proposed by ${safeAuthor}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; border: 1px solid #e8e8e8; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px 18px; font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e8e8e8; background-color: #fafafa;">
                    Meeting
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; font-size: 16px; font-weight: 600; color: #222;">
                    ${safeTitle}
                  </td>
                </tr>
                ${safeDescription ? `
                <tr>
                  <td style="padding: 0 18px 14px; font-size: 14px; line-height: 1.5; color: #555;">
                    ${safeDescription}
                  </td>
                </tr>` : ''}
              </table>

              <div style="margin: 16px 0; padding: 16px 20px; background-color: #f8f9fa; border-left: 4px solid ${ACCENT_GOLD}; border-radius: 4px;">
                <p style="margin: 0 0 8px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: ${CTA_TEXT};">
                  Proposed Times
                </p>
                <ul style="margin: 0; padding-left: 20px;">
                  ${dateRows}
                </ul>
              </div>

              <p style="margin: 20px 0 0; font-size: 15px; line-height: 1.6; color: #555;">
                Please visit the Officer Dashboard to mark your availability.
              </p>

              <!-- CTA -->
              <div style="text-align: center; margin: 32px 0 8px;">
                <a href="${officersUrl}" style="display: inline-block; background-color: ${ACCENT_GOLD}; color: ${CTA_TEXT}; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 700; font-size: 15px;">
                  Mark Your Availability
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${BRAND_BLUE}; padding: 20px 24px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.7);">
                <strong style="color: #ffffff;">Chicken Scratch</strong> &mdash; Hen &amp; Ink Society
              </p>
              <p style="margin: 8px 0 0; font-size: 12px; color: rgba(255,255,255,0.5);">
                This is an automated message. Please do not reply directly to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
