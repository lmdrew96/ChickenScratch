import { desc, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { zineIssues, meetingProposals } from '@/lib/db/schema';

// ISO week number (Mon-start, following ISO 8601).
function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function semesterKey(date: Date): string {
  const month = date.getMonth() + 1;
  // Spring: Jan–May (S1). Summer: June–July falls into S2-prev, but Hen & Ink elections = spring,
  // treat Aug+ as S2 (fall). June/July collapse into prior S1 bucket.
  const year = date.getFullYear();
  if (month >= 8) return `semester-${year}-S2`;
  return `semester-${year}-S1`;
}

export type CadenceBucketContext = {
  currentIssueId: string | null;
  lastMeetingKey: string | null;
};

export async function loadCadenceContext(): Promise<CadenceBucketContext> {
  const database = db();
  const [issueRows, meetingRows] = await Promise.all([
    database
      .select({ id: zineIssues.id, publish_date: zineIssues.publish_date, is_published: zineIssues.is_published })
      .from(zineIssues)
      .orderBy(sql`${zineIssues.publish_date} DESC NULLS LAST`)
      .limit(1),
    database
      .select({ id: meetingProposals.id, finalized_date: meetingProposals.finalized_date })
      .from(meetingProposals)
      .where(sql`${meetingProposals.finalized_date} IS NOT NULL AND ${meetingProposals.finalized_date} <= now()`)
      .orderBy(desc(meetingProposals.finalized_date))
      .limit(1),
  ]);

  return {
    currentIssueId: issueRows[0]?.id ?? null,
    lastMeetingKey: meetingRows[0]?.id ?? null,
  };
}

export function computeCycleKey(
  cadence: string,
  now: Date = new Date(),
  ctx?: CadenceBucketContext,
): string {
  const normalized = cadence.toLowerCase();

  if (normalized === 'weekly' || normalized === 'ongoing') {
    const { year, week } = isoWeek(now);
    return `${normalized}-${year}-W${pad2(week)}`;
  }

  if (normalized === 'bi-weekly' || normalized === 'biweekly') {
    const { year, week } = isoWeek(now);
    const bucket = Math.floor(week / 2);
    return `biweekly-${year}-B${pad2(bucket)}`;
  }

  if (normalized === 'monthly') {
    return `monthly-${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  }

  if (normalized === 'per meeting') {
    const anchor = ctx?.lastMeetingKey ?? `week-${isoWeek(now).year}-W${pad2(isoWeek(now).week)}`;
    return `permeeting-${anchor}`;
  }

  if (normalized === 'per event') {
    const { year, week } = isoWeek(now);
    return `perevent-${year}-W${pad2(week)}`;
  }

  if (normalized === 'per issue') {
    const anchor = ctx?.currentIssueId ?? `fallback-${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
    return `perissue-${anchor}`;
  }

  if (normalized === 'per semester') {
    return semesterKey(now);
  }

  if (normalized === 'annually' || normalized === 'annual') {
    return `annually-${now.getFullYear()}`;
  }

  // Unknown cadence — fall back to a weekly bucket so it behaves predictably.
  const { year, week } = isoWeek(now);
  return `unknown-${normalized.replace(/\s+/g, '-')}-${year}-W${pad2(week)}`;
}
