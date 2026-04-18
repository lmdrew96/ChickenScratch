import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { zineIssues } from '@/lib/db/schema';
import { getSiteConfigValue } from '@/lib/site-config';

export type IssueCycleState = {
  issueTitle: string | null;
  issueVolume: number | null;
  issueNumber: number | null;
  publishDate: Date | null;
  previousPublishDate: Date | null;
  weekOfCycle: number | null;
  totalWeeks: number | null;
  submissionsCloseAt: Date | null;
  daysUntilSubmissionsClose: number | null;
  hasActiveIssue: boolean;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_CYCLE_WEEKS = 4;

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export async function getIssueCycleState(now: Date = new Date()): Promise<IssueCycleState> {
  const database = db();

  // Active issue = next unpublished issue with a publish_date in the future,
  // falling back to the most recent issue of any kind.
  const [upcomingRows, fallbackRows, previousRows] = await Promise.all([
    database
      .select()
      .from(zineIssues)
      .where(and(eq(zineIssues.is_published, false), sql`${zineIssues.publish_date} IS NOT NULL`))
      .orderBy(sql`${zineIssues.publish_date} ASC`)
      .limit(1),
    database
      .select()
      .from(zineIssues)
      .orderBy(sql`${zineIssues.publish_date} DESC NULLS LAST`)
      .limit(1),
    database
      .select()
      .from(zineIssues)
      .where(and(eq(zineIssues.is_published, true), sql`${zineIssues.publish_date} IS NOT NULL`))
      .orderBy(desc(zineIssues.publish_date))
      .limit(1),
  ]);

  const active = upcomingRows[0] ?? fallbackRows[0] ?? null;
  const previous = previousRows[0] ?? null;

  const submissionsCloseRaw = await getSiteConfigValue('chicken_scratch_submission_deadline');
  let submissionsCloseAt: Date | null = null;
  if (submissionsCloseRaw) {
    const parsed = new Date(submissionsCloseRaw);
    if (!Number.isNaN(parsed.getTime())) submissionsCloseAt = parsed;
  }

  if (!active) {
    return {
      issueTitle: null,
      issueVolume: null,
      issueNumber: null,
      publishDate: null,
      previousPublishDate: previous?.publish_date ?? null,
      weekOfCycle: null,
      totalWeeks: null,
      submissionsCloseAt,
      daysUntilSubmissionsClose: submissionsCloseAt ? daysBetween(now, submissionsCloseAt) : null,
      hasActiveIssue: false,
    };
  }

  const publishDate = active.publish_date ?? null;
  const previousPublishDate = previous && previous.id !== active.id ? previous.publish_date : null;

  let weekOfCycle: number | null = null;
  let totalWeeks: number | null = null;
  if (publishDate) {
    const cycleStart = previousPublishDate ?? new Date(publishDate.getTime() - DEFAULT_CYCLE_WEEKS * 7 * MS_PER_DAY);
    totalWeeks = Math.max(1, Math.round((publishDate.getTime() - cycleStart.getTime()) / (7 * MS_PER_DAY)));
    const daysIntoCycle = Math.max(0, daysBetween(cycleStart, now));
    weekOfCycle = Math.min(totalWeeks, Math.max(1, Math.floor(daysIntoCycle / 7) + 1));
  }

  // If no explicit deadline configured, default to one week before publish_date.
  if (!submissionsCloseAt && publishDate) {
    submissionsCloseAt = new Date(publishDate.getTime() - 7 * MS_PER_DAY);
  }

  return {
    issueTitle: active.title ?? null,
    issueVolume: active.volume ?? null,
    issueNumber: active.issue_number ?? null,
    publishDate,
    previousPublishDate,
    weekOfCycle,
    totalWeeks,
    submissionsCloseAt,
    daysUntilSubmissionsClose: submissionsCloseAt ? daysBetween(now, submissionsCloseAt) : null,
    hasActiveIssue: true,
  };
}
