import { escapeHtml } from '@/lib/utils';
import { db } from '@/lib/db';
import { notificationFailures } from '@/lib/db/schema';
import type { Submission } from '@/types/database';
import type { EventRow } from '@/lib/data/event-queries';
import { SIGNUP_CATEGORY_LABEL, type SignupCategory } from '@/lib/validations/event-signup';
import {
  PERFORMANCE_KIND_LABEL,
  type PerformanceKind,
} from '@/lib/validations/event-performance-signup';

export async function logNotificationFailure(params: {
  type: string;
  recipient: string;
  subject: string;
  errorMessage: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db().insert(notificationFailures).values({
      type: params.type,
      recipient: params.recipient,
      subject: params.subject,
      error_message: params.errorMessage,
      context: params.context ?? null,
    });
  } catch {
    console.error('[notification-failure-log] Failed to log notification failure:', params.subject);
  }
}

type Template = 'needs_revision' | 'accepted' | 'declined';

type EmailPayload = {
  template: Template;
  to: string;
  submission: Pick<Submission, 'id' | 'title'>;
  editorNotes?: string | null;
};

const SUBJECTS: Record<Template, string> = {
  needs_revision: 'Revision Requested — Chicken Scratch',
  accepted: 'Your Submission Has Been Accepted — Chicken Scratch',
  declined: 'Submission Update — Chicken Scratch',
};

export async function sendSubmissionEmail({ template, to, submission, editorNotes }: EmailPayload) {
  const subject = SUBJECTS[template];
  const html = generateStatusEmailHtml(template, submission, editorNotes);

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.info('[email]', template, { to, subject, submission, editorNotes });
    return { success: true } as const;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Chicken Scratch <notifications@chickenscratch.me>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[email] Resend API error:', errorData);
    await logNotificationFailure({
      type: 'author_status',
      recipient: to,
      subject,
      errorMessage: JSON.stringify(errorData),
      context: { template, submissionId: submission.id, submissionTitle: submission.title },
    });
    return { success: false } as const;
  }

  return { success: true } as const;
}

// ---------------------------------------------------------------------------
// HTML generation
// ---------------------------------------------------------------------------

const BRAND_BLUE = '#00539f';
const ACCENT_GOLD = '#ffd200';
const CTA_TEXT = '#003b72';

const TEMPLATE_CONTENT: Record<Template, { heading: string; body: string }> = {
  accepted: {
    heading: 'Your Submission Has Been Accepted',
    body: 'Great news! Your submission has been accepted for publication in Chicken Scratch. We loved your work and can\'t wait to share it with our readers.',
  },
  needs_revision: {
    heading: 'Revision Requested',
    body: 'Our editors have reviewed your submission and have some feedback. Please take a look at the notes below and resubmit when you\'re ready.',
  },
  declined: {
    heading: 'Submission Update',
    body: 'Thank you for sharing your work with Chicken Scratch. After careful consideration, we\'re unable to include this piece in our upcoming issue. We encourage you to keep creating and submit again in the future.',
  },
};

function generateStatusEmailHtml(
  template: Template,
  submission: Pick<Submission, 'id' | 'title'>,
  editorNotes?: string | null,
): string {
  const siteUrl = 'https://chickenscratch.me';
  const logoUrl = `${siteUrl}/logo.png`;
  const mineUrl = `${siteUrl}/mine`;
  const { heading, body } = TEMPLATE_CONTENT[template];

  const safeTitle = escapeHtml(submission.title);

  let editorNotesBlock = '';
  if (editorNotes) {
    const safeNotes = escapeHtml(editorNotes);
    editorNotesBlock = `
      <div style="margin: 24px 0; padding: 16px 20px; background-color: #fef9e7; border-left: 4px solid ${ACCENT_GOLD}; border-radius: 4px;">
        <p style="margin: 0 0 6px; font-weight: 600; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: ${CTA_TEXT};">
          Editor Notes
        </p>
        <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #333; white-space: pre-wrap;">${safeNotes}</p>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(heading)}</title>
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
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">${escapeHtml(heading)}</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #555;">
                ${body}
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px; border: 1px solid #e8e8e8; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 14px 18px; font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e8e8e8; background-color: #fafafa;">
                    Submission
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; font-size: 16px; font-weight: 600; color: #222;">
                    ${safeTitle}
                  </td>
                </tr>
              </table>

              ${editorNotesBlock}

              <!-- CTA -->
              <div style="text-align: center; margin: 32px 0 8px;">
                <a href="${mineUrl}" style="display: inline-block; background-color: ${ACCENT_GOLD}; color: ${CTA_TEXT}; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 700; font-size: 15px;">
                  View Your Submissions
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

// ---------------------------------------------------------------------------
// Event signup confirmation
// ---------------------------------------------------------------------------

type SignupConfirmationPayload = {
  to: string;
  name: string;
  item: string;
  category: SignupCategory;
  notes: string | null;
  event: Pick<EventRow, 'slug' | 'name' | 'event_date' | 'location'>;
};

function formatEventDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: 'America/New_York',
  });
}

export async function sendSignupConfirmationEmail(
  payload: SignupConfirmationPayload,
): Promise<{ success: true } | { success: false }> {
  const { to, event } = payload;
  const subject = `🐔 You're signed up for the ${event.name}!`;
  const html = generateSignupConfirmationHtml(payload);

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.info('[email] signup_confirmation', { to, subject });
    return { success: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Chicken Scratch <notifications@chickenscratch.me>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[email] Resend API error (signup confirmation):', errorData);
    await logNotificationFailure({
      type: 'event_signup',
      recipient: to,
      subject,
      errorMessage: JSON.stringify(errorData),
      context: { eventSlug: event.slug, item: payload.item, category: payload.category },
    });
    return { success: false };
  }

  return { success: true };
}

function generateSignupConfirmationHtml(payload: SignupConfirmationPayload): string {
  const { name, item, category, notes, event } = payload;
  const siteUrl = 'https://chickenscratch.me';
  const logoUrl = `${siteUrl}/logo.png`;
  const eventUrl = `${siteUrl}/events/${event.slug}`;

  const safeName = escapeHtml(name);
  const safeEventName = escapeHtml(event.name);
  const safeItem = escapeHtml(item);
  const safeCategoryLabel = escapeHtml(SIGNUP_CATEGORY_LABEL[category]);
  const safeDateTime = escapeHtml(formatEventDateTime(event.event_date));
  const safeLocation = event.location ? escapeHtml(event.location) : 'Location TBD';

  const notesBlock = notes
    ? `
      <tr>
        <td style="padding: 12px 18px; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid #e8e8e8; background-color: #fafafa;">
          Your notes
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; font-size: 15px; color: #333; white-space: pre-wrap;">${escapeHtml(notes)}</td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You&apos;re signed up for the ${safeEventName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: Arial, Helvetica, sans-serif; color: #333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header: Ink Gold banner -->
          <tr>
            <td style="background-color: ${ACCENT_GOLD}; padding: 32px 24px; text-align: center;">
              <img src="${logoUrl}" alt="Chicken Scratch" width="80" height="80" style="display: block; margin: 0 auto 16px; border-radius: 50%;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: ${BRAND_BLUE};">You&apos;re signed up!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333;">
                Hi ${safeName},
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #555;">
                You&apos;re officially signed up for the <strong>${safeEventName}</strong>. Thanks for bringing something to share!
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid #e8e8e8; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e8e8e8; background-color: #fafafa;">
                    You&apos;re bringing
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; font-size: 16px; font-weight: 600; color: #222;">
                    ${safeItem} <span style="font-size: 13px; font-weight: 400; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">&middot; ${safeCategoryLabel}</span>
                  </td>
                </tr>
                ${notesBlock}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid #e8e8e8; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e8e8e8; background-color: #fafafa;">
                    When &amp; where
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; font-size: 15px; color: #222;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${safeDateTime}</div>
                    <div style="color: #555;">${safeLocation}</div>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <div style="text-align: center; margin: 32px 0 8px;">
                <a href="${eventUrl}" style="display: inline-block; background-color: ${ACCENT_GOLD}; color: ${CTA_TEXT}; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 700; font-size: 15px;">
                  See who&apos;s bringing what
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
                Need to change your entry? Reach out to an officer.
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
// Performance signup confirmation
// ---------------------------------------------------------------------------

type PerformanceConfirmationPayload = {
  to: string;
  name: string;
  kind: PerformanceKind;
  piece_title: string;
  estimated_minutes: number;
  content_warnings: string | null;
  notes: string | null;
  event: Pick<EventRow, 'slug' | 'name' | 'event_date' | 'location'>;
};

export async function sendPerformanceConfirmationEmail(
  payload: PerformanceConfirmationPayload,
): Promise<{ success: true } | { success: false }> {
  const { to, event } = payload;
  const subject = `🎤 You're on the bill for the ${event.name}!`;
  const html = generatePerformanceConfirmationHtml(payload);

  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    console.info('[email] performance_confirmation', { to, subject });
    return { success: true };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Chicken Scratch <notifications@chickenscratch.me>',
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[email] Resend API error (performance confirmation):', errorData);
    await logNotificationFailure({
      type: 'event_performance_signup',
      recipient: to,
      subject,
      errorMessage: JSON.stringify(errorData),
      context: {
        eventSlug: event.slug,
        kind: payload.kind,
        piece_title: payload.piece_title,
      },
    });
    return { success: false };
  }

  return { success: true };
}

function generatePerformanceConfirmationHtml(payload: PerformanceConfirmationPayload): string {
  const { name, kind, piece_title, estimated_minutes, content_warnings, notes, event } = payload;
  const siteUrl = 'https://chickenscratch.me';
  const logoUrl = `${siteUrl}/logo.png`;
  const eventUrl = `${siteUrl}/events/${event.slug}`;

  const safeName = escapeHtml(name);
  const safeEventName = escapeHtml(event.name);
  const safeTitle = escapeHtml(piece_title);
  const safeKindLabel = escapeHtml(PERFORMANCE_KIND_LABEL[kind]);
  const safeMinutes = `${estimated_minutes} min`;
  const safeDateTime = escapeHtml(formatEventDateTime(event.event_date));
  const safeLocation = event.location ? escapeHtml(event.location) : 'Location TBD';

  const cwBlock = content_warnings
    ? `
      <tr>
        <td style="padding: 12px 18px; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid #e8e8e8; background-color: #fafafa;">
          Content warnings
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; font-size: 15px; color: #333; white-space: pre-wrap;">${escapeHtml(content_warnings)}</td>
      </tr>`
    : '';

  const notesBlock = notes
    ? `
      <tr>
        <td style="padding: 12px 18px; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 0.05em; border-top: 1px solid #e8e8e8; background-color: #fafafa;">
          Your notes
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; font-size: 15px; color: #333; white-space: pre-wrap;">${escapeHtml(notes)}</td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You&apos;re on the bill for the ${safeEventName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f5f7; font-family: Arial, Helvetica, sans-serif; color: #333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f5f7;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header: Ink Gold banner -->
          <tr>
            <td style="background-color: ${ACCENT_GOLD}; padding: 32px 24px; text-align: center;">
              <img src="${logoUrl}" alt="Chicken Scratch" width="80" height="80" style="display: block; margin: 0 auto 16px; border-radius: 50%;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: ${BRAND_BLUE};">You&apos;re on the bill!</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333;">
                Hi ${safeName},
              </p>
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #555;">
                You&apos;re officially signed up to perform at the <strong>${safeEventName}</strong>. Thanks for sharing your work!
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid #e8e8e8; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e8e8e8; background-color: #fafafa;">
                    Your slot
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; font-size: 16px; font-weight: 600; color: #222;">
                    ${safeTitle} <span style="font-size: 13px; font-weight: 400; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">&middot; ${safeKindLabel} &middot; ${safeMinutes}</span>
                  </td>
                </tr>
                ${cwBlock}
                ${notesBlock}
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px; border: 1px solid #e8e8e8; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 12px 18px; font-size: 13px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e8e8e8; background-color: #fafafa;">
                    When &amp; where
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; font-size: 15px; color: #222;">
                    <div style="font-weight: 600; margin-bottom: 4px;">${safeDateTime}</div>
                    <div style="color: #555;">${safeLocation}</div>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0; font-size: 13px; line-height: 1.6; color: #888;">
                A reminder on content: keep your piece within the same standards as a Hen &amp; Ink Society submission &mdash; no graphic sex or violence, and no incitement of either. An officer will reach out if anything needs adjusting.
              </p>

              <!-- CTA -->
              <div style="text-align: center; margin: 28px 0 8px;">
                <a href="${eventUrl}" style="display: inline-block; background-color: ${ACCENT_GOLD}; color: ${CTA_TEXT}; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 700; font-size: 15px;">
                  See the full bill
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
                Need to change your slot? Reach out to an officer.
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
