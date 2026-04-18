import { and, desc, eq, isNull, ne, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  officerTasks,
  submissions,
  meetingProposals,
} from '@/lib/db/schema';
import { officerToolkits, type RecurringTaskGroup } from '@/lib/data/toolkits';
import { getCompletedTaskIds } from '@/lib/actions/recurring-tasks';
import { getIssueCycleState } from '@/lib/data/issue-cycle';
import { getReceiptAgingAlerts, getCashDepositAlerts } from '@/lib/data/compliance';
import { getGobSummary } from '@/lib/data/ledger-queries';

export type ThisWeekTone = 'info' | 'warn' | 'danger' | 'success';

export type ThisWeekItem = {
  id: string;
  icon: string; // emoji
  title: string;
  tone: ThisWeekTone;
  deadline?: string;
  href?: string;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function getCycleItems(): Promise<ThisWeekItem[]> {
  const state = await getIssueCycleState();
  if (!state.hasActiveIssue) return [];
  const items: ThisWeekItem[] = [];
  if (state.daysUntilSubmissionsClose != null) {
    const days = state.daysUntilSubmissionsClose;
    if (days < 0) {
      items.push({
        id: 'cycle-submissions-closed',
        icon: '📬',
        title: `Submissions closed ${Math.abs(days)}d ago — moving to review`,
        tone: 'info',
      });
    } else if (days <= 7) {
      items.push({
        id: 'cycle-submissions-close',
        icon: '⏳',
        title: `Submissions close in ${days}d`,
        tone: days <= 3 ? 'danger' : 'warn',
      });
    }
  }
  if (state.publishDate) {
    const daysToPublish = Math.round((state.publishDate.getTime() - Date.now()) / MS_PER_DAY);
    if (daysToPublish >= 0 && daysToPublish <= 14) {
      items.push({
        id: 'cycle-publish',
        icon: '🖨️',
        title: `${state.issueTitle ?? 'Next issue'} publishes in ${daysToPublish}d`,
        tone: daysToPublish <= 5 ? 'warn' : 'info',
      });
    }
  }
  return items;
}

async function getOpenRecurringForRole(userId: string, slug: string): Promise<ThisWeekItem[]> {
  const toolkit = officerToolkits.find((t) => t.slug === slug);
  if (!toolkit) return [];
  const allItems = toolkit.recurringTasks.flatMap((g: RecurringTaskGroup) =>
    g.items.map((i) => ({ ...i, cadence: g.cadence })),
  );
  const completedSet = await getCompletedTaskIds(
    userId,
    allItems.map((i) => i.id),
  );

  // Only surface weekly-ish cadences in the card
  const weeklyishCadences = new Set(['Weekly', 'Per Meeting', 'Per Event', 'Ongoing']);
  const open = allItems.filter(
    (i) => weeklyishCadences.has(i.cadence) && !completedSet.has(i.id),
  );
  return open.slice(0, 4).map((i) => ({
    id: `recurring-${i.id}`,
    icon: i.cadence === 'Per Meeting' ? '🗣️' : '✅',
    title: i.label,
    tone: 'info' as ThisWeekTone,
  }));
}

async function getPresidentItems(userId: string): Promise<ThisWeekItem[]> {
  const items: ThisWeekItem[] = [];
  const database = db();
  const now = new Date();
  const horizon = new Date(now.getTime() + 7 * MS_PER_DAY);
  const upcoming = await database
    .select()
    .from(meetingProposals)
    .where(
      and(
        isNull(meetingProposals.archived_at),
        or(
          isNull(meetingProposals.finalized_date),
          eq(meetingProposals.finalized_date, horizon),
        ),
      ),
    )
    .orderBy(desc(meetingProposals.created_at))
    .limit(5);

  for (const m of upcoming) {
    if (m.finalized_date) {
      const days = Math.round((m.finalized_date.getTime() - now.getTime()) / MS_PER_DAY);
      if (days >= 0 && days <= 7) {
        items.push({
          id: `meeting-${m.id}`,
          icon: '📅',
          title: `${m.title} in ${days}d`,
          tone: days <= 2 ? 'warn' : 'info',
          href: '/officers#meetings',
        });
      }
    } else if (!m.finalized_at) {
      items.push({
        id: `meeting-unscheduled-${m.id}`,
        icon: '📅',
        title: `${m.title} — no date finalized yet`,
        tone: 'warn',
        href: '/officers#meetings',
      });
    }
  }

  const openTasks = await database
    .select({ count: officerTasks.id })
    .from(officerTasks)
    .where(ne(officerTasks.status, 'done'))
    .limit(1);
  if (openTasks.length > 0) {
    items.push({
      id: 'officer-open-tasks',
      icon: '📋',
      title: 'Open officer tasks',
      tone: 'info',
      href: '/officers#tasks',
    });
  }

  const recurring = await getOpenRecurringForRole(userId, 'president');
  items.push(...recurring);
  return items;
}

async function getTreasurerItems(userId: string): Promise<ThisWeekItem[]> {
  const items: ThisWeekItem[] = [];
  const [receiptAlerts, cashAlerts, gob] = await Promise.all([
    getReceiptAgingAlerts(),
    getCashDepositAlerts(),
    getGobSummary(),
  ]);

  for (const alert of receiptAlerts.slice(0, 3)) {
    items.push({
      id: `receipt-${alert.id}`,
      icon: '🧾',
      title:
        alert.tone === 'past'
          ? `Receipt past the 45-day RFC window — ${alert.description}`
          : `Receipt at day ${alert.daysSinceReceipt} of 45 — ${alert.description}`,
      tone: alert.tone === 'danger' || alert.tone === 'past' ? 'danger' : 'warn',
    });
  }

  for (const c of cashAlerts.slice(0, 2)) {
    items.push({
      id: `cash-${c.id}`,
      icon: '💵',
      title: c.overdue
        ? `Undeposited cash (${Math.abs(Math.floor(c.hoursUntilDeadline))}h past 24h rule)`
        : `Cash donation: deposit within ${Math.floor(c.hoursUntilDeadline)}h`,
      tone: c.overdue ? 'danger' : 'warn',
    });
  }

  if (gob.pct >= 80) {
    items.push({
      id: 'gob-budget',
      icon: '💰',
      title: `$${(gob.remainingCents / 100).toFixed(2)} of $${(gob.budgetCents / 100).toFixed(0)} GOB remaining`,
      tone: gob.pct >= 90 ? 'danger' : 'warn',
    });
  }

  const recurring = await getOpenRecurringForRole(userId, 'treasurer');
  items.push(...recurring);
  return items;
}

async function getSecretaryItems(userId: string): Promise<ThisWeekItem[]> {
  const items: ThisWeekItem[] = [];
  const database = db();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart.getTime() + MS_PER_DAY);
  const todaysMeetings = await database
    .select({ id: meetingProposals.id, title: meetingProposals.title, finalized_date: meetingProposals.finalized_date })
    .from(meetingProposals)
    .where(
      and(
        isNull(meetingProposals.archived_at),
        and(
          // finalized_date between today and tomorrow
          // using raw SQL comparisons for brevity
        ),
      ),
    )
    .limit(5);
  // filter in JS since drizzle range is noisy here
  for (const m of todaysMeetings) {
    if (!m.finalized_date) continue;
    const d = m.finalized_date.getTime();
    if (d >= todayStart.getTime() && d < todayEnd.getTime()) {
      items.push({
        id: `take-attendance-${m.id}`,
        icon: '📝',
        title: `Take attendance for "${m.title}"`,
        tone: 'warn',
      });
    }
  }

  const recurring = await getOpenRecurringForRole(userId, 'secretary');
  items.push(...recurring);
  return items;
}

async function getPrItems(userId: string): Promise<ThisWeekItem[]> {
  const items: ThisWeekItem[] = [];
  const state = await getIssueCycleState();
  if (state.hasActiveIssue && state.publishDate) {
    const days = Math.round((state.publishDate.getTime() - Date.now()) / MS_PER_DAY);
    if (days >= 0 && days <= 10) {
      items.push({
        id: 'pr-publish-promo',
        icon: '📣',
        title: `Queue issue-release promo (${days}d to publish)`,
        tone: days <= 5 ? 'warn' : 'info',
      });
    }
  }
  const recurring = await getOpenRecurringForRole(userId, 'pr-chair');
  items.push(...recurring);
  return items;
}

async function getPendingReviewBadge(slug: string): Promise<ThisWeekItem | null> {
  const pending = await db()
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        ne(submissions.status, 'withdrawn'),
        or(
          isNull(submissions.committee_status),
          eq(submissions.committee_status, 'pending_coordinator'),
          eq(submissions.committee_status, 'with_coordinator'),
        ),
      ),
    )
    .limit(50);
  if (pending.length === 0) return null;
  // Only surface on roles that touch the queue broadly
  if (!['president', 'secretary'].includes(slug)) return null;
  return {
    id: 'pending-review-count',
    icon: '📑',
    title: `${pending.length} submission${pending.length === 1 ? '' : 's'} awaiting coordinator review`,
    tone: pending.length >= 10 ? 'warn' : 'info',
    href: '/committee',
  };
}

export async function getThisWeek(userId: string, slug: string): Promise<ThisWeekItem[]> {
  const cycleItems = await getCycleItems();
  let roleItems: ThisWeekItem[] = [];
  switch (slug) {
    case 'president':
      roleItems = await getPresidentItems(userId);
      break;
    case 'treasurer':
      roleItems = await getTreasurerItems(userId);
      break;
    case 'secretary':
      roleItems = await getSecretaryItems(userId);
      break;
    case 'pr-chair':
      roleItems = await getPrItems(userId);
      break;
    default:
      roleItems = await getOpenRecurringForRole(userId, slug);
  }
  const queueBadge = await getPendingReviewBadge(slug);
  const all = [...cycleItems, ...(queueBadge ? [queueBadge] : []), ...roleItems];
  // Sort: danger > warn > info > success
  const tonePriority: Record<ThisWeekTone, number> = { danger: 0, warn: 1, info: 2, success: 3 };
  all.sort((a, b) => tonePriority[a.tone] - tonePriority[b.tone]);
  return all.slice(0, 8);
}
