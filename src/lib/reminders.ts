import { and, eq, lt, gt, isNull, isNotNull, ne, inArray, arrayContains, arrayOverlaps, or } from 'drizzle-orm';

import { db } from '@/lib/db';
import { submissions, officerTasks, meetingProposals, officerAvailability, userRoles, profiles, reminderLog } from '@/lib/db/schema';
import { OFFICER_POSITIONS } from '@/lib/auth/guards';
import { escapeHtml } from '@/lib/utils';

const STALE_DAYS = 3;
const BRAND_BLUE = '#00539f';
const ACCENT_GOLD = '#ffd200';
const CTA_TEXT = '#003b72';

type ReminderResult = { sent: number };

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ---------------------------------------------------------------------------
// Dedup helper
// ---------------------------------------------------------------------------

async function wasRecentlyReminded(
  database: ReturnType<typeof db>,
  entityType: string,
  entityId: string,
  reminderType: string,
  email: string,
): Promise<boolean> {
  const cutoff = daysAgo(STALE_DAYS);
  const rows = await database
    .select({ id: reminderLog.id })
    .from(reminderLog)
    .where(
      and(
        eq(reminderLog.entity_type, entityType),
        eq(reminderLog.entity_id, entityId),
        eq(reminderLog.reminder_type, reminderType),
        eq(reminderLog.sent_to, email),
        gt(reminderLog.sent_at, cutoff),
      )
    )
    .limit(1);
  return rows.length > 0;
}

async function logReminder(
  database: ReturnType<typeof db>,
  entityType: string,
  entityId: string,
  reminderType: string,
  sentTo: string,
) {
  await database.insert(reminderLog).values({
    entity_type: entityType,
    entity_id: entityId,
    reminder_type: reminderType,
    sent_to: sentTo,
  });
}

// ---------------------------------------------------------------------------
// Email helper
// ---------------------------------------------------------------------------

async function sendReminderEmail(to: string[], subject: string, html: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.info('[reminder]', subject, { to });
    return true;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Chicken Scratch <notifications@chickenscratch.me>',
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('[reminder] Resend API error:', errorData);
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Position → email lookup
// ---------------------------------------------------------------------------

async function getEmailsForPositions(database: ReturnType<typeof db>, positions: string[]): Promise<string[]> {
  const roleRows = await database
    .select({ user_id: userRoles.user_id })
    .from(userRoles)
    .where(or(...positions.map((pos) => arrayContains(userRoles.positions, [pos]))));

  if (roleRows.length === 0) return [];

  const userIds = roleRows.map((r) => r.user_id);
  const profileRows = await database
    .select({ email: profiles.email })
    .from(profiles)
    .where(inArray(profiles.id, userIds));

  return profileRows.map((p) => p.email).filter((e): e is string => !!e);
}

async function getOfficerEmails(database: ReturnType<typeof db>): Promise<string[]> {
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
  ])];

  if (officerUserIds.length === 0) return [];

  const profileRows = await database
    .select({ id: profiles.id, email: profiles.email })
    .from(profiles)
    .where(inArray(profiles.id, officerUserIds));

  return profileRows.map((p) => p.email).filter((e): e is string => !!e);
}

async function getOfficerUserIds(database: ReturnType<typeof db>): Promise<string[]> {
  const roleRows = await database
    .select({ user_id: userRoles.user_id })
    .from(userRoles)
    .where(arrayContains(userRoles.roles, ['officer']));

  const positionRows = await database
    .select({ user_id: userRoles.user_id })
    .from(userRoles)
    .where(arrayOverlaps(userRoles.positions, [...OFFICER_POSITIONS]));

  return [...new Set([
    ...roleRows.map((r) => r.user_id),
    ...positionRows.map((r) => r.user_id),
  ])];
}

async function getEmailForUserId(database: ReturnType<typeof db>, userId: string): Promise<string | null> {
  const rows = await database
    .select({ email: profiles.email })
    .from(profiles)
    .where(eq(profiles.id, userId))
    .limit(1);
  return rows[0]?.email ?? null;
}

// ---------------------------------------------------------------------------
// 1. Stale committee submissions
// ---------------------------------------------------------------------------

const STATUS_TO_POSITION: Record<string, string | { writing: string; visual: string }> = {
  'pending_coordinator': 'Submissions Coordinator',
  'with_coordinator': 'Submissions Coordinator',
  'coordinator_approved': { writing: 'Proofreader', visual: 'Lead Design' },
  'proofreader_committed': 'Lead Design',
  'lead_design_committed': 'Editor-in-Chief',
};

const STATUS_TO_TIMESTAMP: Record<string, string> = {
  'pending_coordinator': 'updated_at',
  'with_coordinator': 'updated_at',
  'coordinator_approved': 'coordinator_reviewed_at',
  'proofreader_committed': 'proofreader_committed_at',
  'lead_design_committed': 'lead_design_committed_at',
};

export async function checkStaleSubmissions(): Promise<ReminderResult> {
  const database = db();
  const cutoff = daysAgo(STALE_DAYS);
  let sent = 0;

  const activeStatuses = Object.keys(STATUS_TO_POSITION);

  // Get submissions in active committee statuses
  const staleSubmissions = await database
    .select({
      id: submissions.id,
      title: submissions.title,
      type: submissions.type,
      committee_status: submissions.committee_status,
      updated_at: submissions.updated_at,
      coordinator_reviewed_at: submissions.coordinator_reviewed_at,
      proofreader_committed_at: submissions.proofreader_committed_at,
      lead_design_committed_at: submissions.lead_design_committed_at,
    })
    .from(submissions)
    .where(inArray(submissions.committee_status, activeStatuses));

  for (const sub of staleSubmissions) {
    const status = sub.committee_status!;
    const tsField = STATUS_TO_TIMESTAMP[status];
    if (!tsField) continue;

    // Get the relevant timestamp
    const relevantTs = (sub as Record<string, unknown>)[tsField] as Date | null;
    if (!relevantTs || relevantTs > cutoff) continue;

    // Determine target position
    const mapping = STATUS_TO_POSITION[status];
    let targetPositions: string[];
    if (typeof mapping === 'string') {
      targetPositions = [mapping];
    } else if (mapping) {
      targetPositions = [sub.type === 'writing' ? mapping.writing : mapping.visual];
    } else {
      continue;
    }

    const emails = await getEmailsForPositions(database, targetPositions);

    for (const email of emails) {
      if (await wasRecentlyReminded(database, 'submission', sub.id, 'stale_submission', email)) continue;

      const daysSince = Math.floor((Date.now() - relevantTs.getTime()) / (1000 * 60 * 60 * 24));
      const ok = await sendReminderEmail(
        [email],
        `Reminder: "${sub.title}" needs attention — Chicken Scratch`,
        generateStaleSubmissionEmail(sub.title, status, daysSince),
      );

      if (ok) {
        await logReminder(database, 'submission', sub.id, 'stale_submission', email);
        sent++;
      }
    }
  }

  return { sent };
}

// ---------------------------------------------------------------------------
// 2. Overdue officer tasks
// ---------------------------------------------------------------------------

export async function checkOverdueTasks(): Promise<ReminderResult> {
  const database = db();
  const now = new Date();
  let sent = 0;

  const overdueTasks = await database
    .select({
      id: officerTasks.id,
      title: officerTasks.title,
      assigned_to: officerTasks.assigned_to,
      due_date: officerTasks.due_date,
    })
    .from(officerTasks)
    .where(
      and(
        isNotNull(officerTasks.due_date),
        lt(officerTasks.due_date, now),
        ne(officerTasks.status, 'completed'),
      )
    );

  for (const task of overdueTasks) {
    const recipients = task.assigned_to
      ? [await getEmailForUserId(database, task.assigned_to)].filter((e): e is string => !!e)
      : await getOfficerEmails(database);

    const daysOverdue = Math.floor((now.getTime() - task.due_date!.getTime()) / (1000 * 60 * 60 * 24));

    for (const email of recipients) {
      if (await wasRecentlyReminded(database, 'task', task.id, 'overdue_task', email)) continue;

      const ok = await sendReminderEmail(
        [email],
        `Overdue: "${task.title}" — Chicken Scratch`,
        generateOverdueTaskEmail(task.title, daysOverdue),
      );

      if (ok) {
        await logReminder(database, 'task', task.id, 'overdue_task', email);
        sent++;
      }
    }
  }

  return { sent };
}

// ---------------------------------------------------------------------------
// 3. Stale officer tasks (todo, no due date, 3+ days old)
// ---------------------------------------------------------------------------

export async function checkStaleTasks(): Promise<ReminderResult> {
  const database = db();
  const cutoff = daysAgo(STALE_DAYS);
  let sent = 0;

  const staleTasks = await database
    .select({
      id: officerTasks.id,
      title: officerTasks.title,
      assigned_to: officerTasks.assigned_to,
      created_at: officerTasks.created_at,
    })
    .from(officerTasks)
    .where(
      and(
        eq(officerTasks.status, 'todo'),
        isNull(officerTasks.due_date),
        lt(officerTasks.created_at, cutoff),
      )
    );

  for (const task of staleTasks) {
    const recipients = task.assigned_to
      ? [await getEmailForUserId(database, task.assigned_to)].filter((e): e is string => !!e)
      : await getOfficerEmails(database);

    const daysSince = Math.floor((Date.now() - (task.created_at?.getTime() ?? Date.now())) / (1000 * 60 * 60 * 24));

    for (const email of recipients) {
      if (await wasRecentlyReminded(database, 'task', task.id, 'stale_task', email)) continue;

      const ok = await sendReminderEmail(
        [email],
        `Reminder: "${task.title}" hasn't been started — Chicken Scratch`,
        generateStaleTaskEmail(task.title, daysSince),
      );

      if (ok) {
        await logReminder(database, 'task', task.id, 'stale_task', email);
        sent++;
      }
    }
  }

  return { sent };
}

// ---------------------------------------------------------------------------
// 4. Meeting proposals with low response
// ---------------------------------------------------------------------------

export async function checkMeetingResponses(): Promise<ReminderResult> {
  const database = db();
  const cutoff = daysAgo(STALE_DAYS);
  let sent = 0;

  // Get unfinalised proposals older than 3 days
  const staleProposals = await database
    .select({
      id: meetingProposals.id,
      title: meetingProposals.title,
      created_at: meetingProposals.created_at,
    })
    .from(meetingProposals)
    .where(
      and(
        isNull(meetingProposals.finalized_date),
        lt(meetingProposals.created_at, cutoff),
      )
    );

  if (staleProposals.length === 0) return { sent: 0 };

  // Get all officer user IDs
  const allOfficerIds = await getOfficerUserIds(database);
  if (allOfficerIds.length === 0) return { sent: 0 };

  for (const proposal of staleProposals) {
    // Get who has already responded
    const responses = await database
      .select({ user_id: officerAvailability.user_id })
      .from(officerAvailability)
      .where(eq(officerAvailability.meeting_proposal_id, proposal.id));

    const respondedIds = new Set(responses.map((r) => r.user_id));
    const nonResponders = allOfficerIds.filter((id) => !respondedIds.has(id));

    // Only nudge if fewer than half have responded
    if (respondedIds.size >= allOfficerIds.length / 2) continue;

    for (const userId of nonResponders) {
      const email = await getEmailForUserId(database, userId);
      if (!email) continue;

      if (await wasRecentlyReminded(database, 'meeting', proposal.id, 'meeting_response', email)) continue;

      const ok = await sendReminderEmail(
        [email],
        `Please respond: "${proposal.title}" — Chicken Scratch`,
        generateMeetingResponseEmail(proposal.title),
      );

      if (ok) {
        await logReminder(database, 'meeting', proposal.id, 'meeting_response', email);
        sent++;
      }
    }
  }

  return { sent };
}

// ---------------------------------------------------------------------------
// HTML templates
// ---------------------------------------------------------------------------

const SITE_URL = 'https://chickenscratch.me';

function wrapEmail(heading: string, bodyContent: string, ctaUrl: string, ctaLabel: string): string {
  const logoUrl = `${SITE_URL}/logo.png`;

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
              ${bodyContent}

              <!-- CTA -->
              <div style="text-align: center; margin: 32px 0 8px;">
                <a href="${ctaUrl}" style="display: inline-block; background-color: ${ACCENT_GOLD}; color: ${CTA_TEXT}; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 700; font-size: 15px;">
                  ${escapeHtml(ctaLabel)}
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
                This is an automated reminder. Please do not reply directly to this email.
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

const STATUS_LABELS: Record<string, string> = {
  'pending_coordinator': 'Pending coordinator review',
  'with_coordinator': 'With coordinator',
  'coordinator_approved': 'Awaiting proofreading / design',
  'proofreader_committed': 'Awaiting design layout',
  'lead_design_committed': 'Awaiting Editor-in-Chief decision',
};

function generateStaleSubmissionEmail(title: string, status: string, daysSince: number): string {
  const safeTitle = escapeHtml(title);
  const statusLabel = STATUS_LABELS[status] || status;

  return wrapEmail(
    'Submission Needs Attention',
    `<p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #555;">
        A submission has been waiting for <strong>${daysSince} day${daysSince === 1 ? '' : 's'}</strong> without progress.
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
        <tr>
          <td style="padding: 0 18px 14px; font-size: 14px; color: #555;">
            Status: ${escapeHtml(statusLabel)}
          </td>
        </tr>
      </table>`,
    `${SITE_URL}/committee`,
    'View Committee Dashboard',
  );
}

function generateOverdueTaskEmail(title: string, daysOverdue: number): string {
  const safeTitle = escapeHtml(title);

  return wrapEmail(
    'Overdue Task',
    `<p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #555;">
        You have a task that is <strong>${daysOverdue} day${daysOverdue === 1 ? '' : 's'}</strong> overdue.
      </p>
      <div style="margin: 16px 0; padding: 16px 20px; background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 4px;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #222;">${safeTitle}</p>
      </div>`,
    `${SITE_URL}/officers`,
    'View Officer Dashboard',
  );
}

function generateStaleTaskEmail(title: string, daysSince: number): string {
  const safeTitle = escapeHtml(title);

  return wrapEmail(
    'Task Hasn\'t Been Started',
    `<p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #555;">
        A task was created <strong>${daysSince} day${daysSince === 1 ? '' : 's'} ago</strong> and hasn't been started yet.
      </p>
      <div style="margin: 16px 0; padding: 16px 20px; background-color: #fef9e7; border-left: 4px solid ${ACCENT_GOLD}; border-radius: 4px;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #222;">${safeTitle}</p>
      </div>`,
    `${SITE_URL}/officers`,
    'View Officer Dashboard',
  );
}

function generateMeetingResponseEmail(title: string): string {
  const safeTitle = escapeHtml(title);

  return wrapEmail(
    'Meeting Response Needed',
    `<p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #555;">
        A meeting proposal is waiting for your availability. Please mark which times work for you.
      </p>
      <div style="margin: 16px 0; padding: 16px 20px; background-color: #f8f9fa; border-left: 4px solid ${ACCENT_GOLD}; border-radius: 4px;">
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #222;">${safeTitle}</p>
      </div>`,
    `${SITE_URL}/officers`,
    'Mark Your Availability',
  );
}
