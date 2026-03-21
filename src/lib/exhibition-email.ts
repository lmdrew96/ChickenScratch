import { arrayContains, arrayOverlaps, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { userRoles, profiles } from '@/lib/db/schema';
import { OFFICER_POSITIONS } from '@/lib/auth/guards';
import { escapeHtml } from '@/lib/utils';
import { logNotificationFailure } from '@/lib/email';

const BRAND_BLUE = '#00539f';
const ACCENT_GOLD = '#ffd200';
const CTA_TEXT = '#003b72';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chickenscratch.me';

async function getOfficerEmails(): Promise<string[]> {
  const database = db();

  const roleRows = await database
    .select({ user_id: userRoles.user_id })
    .from(userRoles)
    .where(arrayContains(userRoles.roles, ['officer']));

  const positionRows = await database
    .select({ user_id: userRoles.user_id })
    .from(userRoles)
    .where(arrayOverlaps(userRoles.positions, [...OFFICER_POSITIONS]));

  const officerUserIds = [
    ...new Set([
      ...roleRows.map((r) => r.user_id),
      ...positionRows.map((r) => r.user_id),
    ]),
  ];

  if (officerUserIds.length === 0) return [];

  const profileRows = await database
    .select({ email: profiles.email })
    .from(profiles)
    .where(inArray(profiles.id, officerUserIds));

  return profileRows
    .map((p) => p.email)
    .filter((email): email is string => !!email);
}

async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  context: Record<string, unknown>,
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.info('[exhibition-email]', subject, { to });
    return;
  }

  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) return;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Chicken Scratch <notifications@chickenscratch.me>',
      to: recipients,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[exhibition-email] Resend error:', errorData);
    for (const recipient of recipients) {
      await logNotificationFailure({
        type: 'exhibition',
        recipient,
        subject,
        errorMessage: JSON.stringify(errorData),
        context,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function baseTemplate(heading: string, bodyHtml: string, ctaLabel: string, ctaHref: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
          style="max-width:600px;width:100%;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
          <tr>
            <td style="background:${BRAND_BLUE};padding:32px 24px;text-align:center;">
              <img src="${SITE_URL}/logo.png" alt="Chicken Scratch" width="80" height="80"
                style="display:block;margin:0 auto 16px;border-radius:50%;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#fff;">${escapeHtml(heading)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;">
              ${bodyHtml}
              <div style="text-align:center;margin:32px 0 8px;">
                <a href="${ctaHref}"
                  style="display:inline-block;background:${ACCENT_GOLD};color:${CTA_TEXT};text-decoration:none;padding:14px 32px;border-radius:6px;font-weight:700;font-size:15px;">
                  ${escapeHtml(ctaLabel)}
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND_BLUE};padding:20px 24px;text-align:center;">
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,.7);">
                <strong style="color:#fff;">Chicken Scratch</strong> &mdash; Hen &amp; Ink Society
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:rgba(255,255,255,.5);">
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

// ---------------------------------------------------------------------------
// 1. Submission confirmation → sent to submitter
// ---------------------------------------------------------------------------

export async function sendExhibitionConfirmation(params: {
  to: string;
  title: string;
  submissionId: string;
}): Promise<void> {
  const { to, title, submissionId } = params;

  const body = `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">
      Thank you for submitting your work to the
      <strong>Hen &amp; Ink End-of-Year Exhibition</strong>! We&rsquo;ve received your piece and will
      review it soon.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin-bottom:20px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
      <tr>
        <td style="padding:14px 18px;font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e8e8e8;background:#fafafa;">
          Your submission
        </td>
      </tr>
      <tr>
        <td style="padding:14px 18px;font-size:16px;font-weight:600;color:#222;">
          ${escapeHtml(title)}
        </td>
      </tr>
    </table>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#666;">
      You can view the status of your submission on the
      <a href="${SITE_URL}/exhibition/mine" style="color:${BRAND_BLUE};">My Exhibition Submissions</a> page.
      We&rsquo;ll email you when a decision has been made.
    </p>`;

  const html = baseTemplate(
    'Exhibition Submission Received',
    body,
    'View My Submissions',
    `${SITE_URL}/exhibition/mine`,
  );

  await sendEmail(to, 'Exhibition Submission Received — Hen & Ink', html, {
    submissionId,
    title,
  });
}

// ---------------------------------------------------------------------------
// 2. New submission alert → sent to officers
// ---------------------------------------------------------------------------

export async function notifyOfficersOfExhibitionSubmission(params: {
  title: string;
  submitterName: string;
  type: string;
  medium: string;
  submissionId: string;
}): Promise<void> {
  const { title, submitterName, type, medium, submissionId } = params;

  const recipients = await getOfficerEmails();
  if (recipients.length === 0) return;

  const body = `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">
      A new exhibition submission has been received and is awaiting review.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin-bottom:20px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
      <tr>
        <td colspan="2" style="padding:14px 18px;font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e8e8e8;background:#fafafa;">
          Submission details
        </td>
      </tr>
      <tr style="border-bottom:1px solid #e8e8e8;">
        <td style="padding:12px 18px;font-size:13px;color:#888;width:40%;border-right:1px solid #e8e8e8;">Title</td>
        <td style="padding:12px 18px;font-size:14px;color:#222;font-weight:600;">${escapeHtml(title)}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e8e8;">
        <td style="padding:12px 18px;font-size:13px;color:#888;border-right:1px solid #e8e8e8;">Submitted by</td>
        <td style="padding:12px 18px;font-size:14px;color:#222;">${escapeHtml(submitterName)}</td>
      </tr>
      <tr style="border-bottom:1px solid #e8e8e8;">
        <td style="padding:12px 18px;font-size:13px;color:#888;border-right:1px solid #e8e8e8;">Type</td>
        <td style="padding:12px 18px;font-size:14px;color:#222;">${escapeHtml(type)}</td>
      </tr>
      <tr>
        <td style="padding:12px 18px;font-size:13px;color:#888;border-right:1px solid #e8e8e8;">Medium</td>
        <td style="padding:12px 18px;font-size:14px;color:#222;">${escapeHtml(medium)}</td>
      </tr>
    </table>`;

  const html = baseTemplate(
    'New Exhibition Submission',
    body,
    'Review Submission',
    `${SITE_URL}/admin/exhibition`,
  );

  await sendEmail(
    recipients,
    `New Exhibition Submission: "${title}" — Hen & Ink`,
    html,
    { submissionId, title, submitterName },
  );
}

// ---------------------------------------------------------------------------
// 3. Decision notification → sent to submitter when approved or declined
// ---------------------------------------------------------------------------

export async function sendExhibitionDecisionEmail(params: {
  to: string;
  title: string;
  status: 'approved' | 'declined';
  reviewerNotes?: string | null;
  submissionId: string;
}): Promise<void> {
  const { to, title, status, reviewerNotes, submissionId } = params;

  const isApproved = status === 'approved';
  const heading = isApproved
    ? 'Your Work Has Been Selected!'
    : 'Exhibition Submission Update';

  const introText = isApproved
    ? 'Congratulations! Your submission has been selected for the <strong>Hen &amp; Ink End-of-Year Exhibition</strong> on May 1, 2026. We can\'t wait to showcase your work!'
    : 'Thank you for sharing your work with us. After careful consideration, we\'re unable to include this piece in the exhibition. We encourage you to keep creating!';

  let notesBlock = '';
  if (reviewerNotes) {
    notesBlock = `
      <div style="margin:24px 0;padding:16px 20px;background:#fef9e7;border-left:4px solid ${ACCENT_GOLD};border-radius:4px;">
        <p style="margin:0 0 6px;font-weight:600;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:${CTA_TEXT};">
          Reviewer Notes
        </p>
        <p style="margin:0;font-size:15px;line-height:1.6;color:#333;white-space:pre-wrap;">${escapeHtml(reviewerNotes)}</p>
      </div>`;
  }

  const body = `
    <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#555;">${introText}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
      style="margin-bottom:20px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
      <tr>
        <td style="padding:14px 18px;font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e8e8e8;background:#fafafa;">
          Submission
        </td>
      </tr>
      <tr>
        <td style="padding:14px 18px;font-size:16px;font-weight:600;color:#222;">${escapeHtml(title)}</td>
      </tr>
    </table>
    ${notesBlock}`;

  const html = baseTemplate(
    heading,
    body,
    'View My Submissions',
    `${SITE_URL}/exhibition/mine`,
  );

  await sendEmail(
    to,
    isApproved
      ? 'Your Work Has Been Selected — Hen & Ink Exhibition'
      : 'Exhibition Submission Update — Hen & Ink',
    html,
    { submissionId, title, status },
  );
}
