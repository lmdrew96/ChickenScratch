import { and, eq, gte, lt, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  groupMeetingCheckins,
  meetingAttendance,
  meetingProposals,
  profiles,
  userRoles,
} from '@/lib/db/schema';
import { easternMonthBounds, toEasternDateString } from '@/lib/utils';

export type AttendanceStatus = 'present' | 'absent' | 'excused';

export type MeetingToday = {
  id: string;
  title: string;
  finalized_date: Date | null;
};

const MS_PER_HOUR = 60 * 60 * 1000;
const GRACE_HOURS_AFTER_MEETING = 6;

export async function getMeetingsInAttendanceWindow(now: Date = new Date()): Promise<MeetingToday[]> {
  const windowStart = new Date(now);
  windowStart.setHours(0, 0, 0, 0);
  const windowEnd = new Date(now.getTime() + 12 * MS_PER_HOUR);
  const rows = await db()
    .select({
      id: meetingProposals.id,
      title: meetingProposals.title,
      finalized_date: meetingProposals.finalized_date,
    })
    .from(meetingProposals)
    .where(
      and(
        gte(meetingProposals.finalized_date, windowStart),
        lte(meetingProposals.finalized_date, windowEnd),
      ),
    )
    .orderBy(meetingProposals.finalized_date);

  // Also include meetings that JUST ended (within the grace window)
  const gracedStart = new Date(now.getTime() - GRACE_HOURS_AFTER_MEETING * MS_PER_HOUR);
  const recentEnded = await db()
    .select({
      id: meetingProposals.id,
      title: meetingProposals.title,
      finalized_date: meetingProposals.finalized_date,
    })
    .from(meetingProposals)
    .where(
      and(
        gte(meetingProposals.finalized_date, gracedStart),
        lte(meetingProposals.finalized_date, windowStart),
      ),
    );

  const merged = new Map<string, MeetingToday>();
  for (const row of [...rows, ...recentEnded]) merged.set(row.id, row);
  return Array.from(merged.values());
}

export type MemberRow = {
  id: string;
  name: string | null;
  email: string | null;
};

export async function getActiveMembers(): Promise<MemberRow[]> {
  const rows = await db()
    .select({
      id: profiles.id,
      name: profiles.name,
      full_name: profiles.full_name,
      email: profiles.email,
    })
    .from(profiles)
    .innerJoin(userRoles, eq(userRoles.user_id, profiles.id))
    .where(eq(userRoles.is_member, true))
    .orderBy(profiles.name);
  return rows.map((r) => ({
    id: r.id,
    name: r.name ?? r.full_name ?? r.email,
    email: r.email,
  }));
}

export type AttendanceRecord = {
  member_id: string;
  status: AttendanceStatus;
};

export async function getAttendanceForMeeting(meetingId: string): Promise<AttendanceRecord[]> {
  const rows = await db()
    .select({ member_id: meetingAttendance.member_id, status: meetingAttendance.status })
    .from(meetingAttendance)
    .where(eq(meetingAttendance.meeting_id, meetingId));
  return rows.map((r) => ({ member_id: r.member_id, status: r.status as AttendanceStatus }));
}

export type VotingRisk = {
  member_id: string;
  name: string | null;
  checkinsThisMonth: number;
  shortfall: number; // max(0, 3 - checkinsThisMonth)
  consecutiveMonthsBelow: number; // consecutive recent months with <3 check-ins (current included if applicable)
};

const REQUIRED_PER_MONTH = 3;

export async function getVotingRightsAtRisk(now: Date = new Date()): Promise<VotingRisk[]> {
  // Article VIII: ≥3 group meetings/month for voting rights; 2 consecutive
  // months below the minimum triggers membership revocation. Counts come from
  // `group_meeting_checkins` (self-service QR + officer manual overrides) —
  // the officer-meeting `meeting_attendance` table is irrelevant here.

  const todayEt = toEasternDateString(now);
  const currentYear = Number(todayEt.slice(0, 4));
  const currentMonth = Number(todayEt.slice(5, 7));
  const todayDay = Number(todayEt.slice(8, 10));

  // Build the three months we care about: current + 2 prior, oldest first.
  type Bucket = { year: number; month: number; start: Date; end: Date };
  const buckets: Bucket[] = [];
  for (let i = 2; i >= 0; i -= 1) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const { start, end } = easternMonthBounds(y, m);
    buckets.push({ year: y, month: m, start, end });
  }

  const windowStart = buckets[0]!.start;
  const windowEnd = buckets[buckets.length - 1]!.end;

  // Pull all members + check-ins in the 3-month window.
  const memberRows = await db()
    .select({
      id: profiles.id,
      name: profiles.name,
      full_name: profiles.full_name,
    })
    .from(profiles)
    .innerJoin(userRoles, eq(userRoles.user_id, profiles.id))
    .where(eq(userRoles.is_member, true));

  const checkinRows = await db()
    .select({
      member_id: groupMeetingCheckins.member_id,
      meeting_date: groupMeetingCheckins.meeting_date,
    })
    .from(groupMeetingCheckins)
    .where(
      and(
        gte(groupMeetingCheckins.meeting_date, windowStart),
        lt(groupMeetingCheckins.meeting_date, windowEnd),
      ),
    );

  // Count check-ins per (member, bucket).
  const counts = new Map<string, number[]>(); // member_id → [count_oldest, ..., count_current]
  for (const m of memberRows) counts.set(m.id, [0, 0, 0]);
  for (const row of checkinRows) {
    const ts = row.meeting_date.getTime();
    const idx = buckets.findIndex((b) => ts >= b.start.getTime() && ts < b.end.getTime());
    if (idx === -1) continue;
    const arr = counts.get(row.member_id);
    if (!arr) continue;
    arr[idx] = (arr[idx] ?? 0) + 1;
  }

  // Daysleft used to decide whether the current month is "at risk" or just early.
  const lastDayOfCurrentMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
  const daysRemaining = lastDayOfCurrentMonth - todayDay + 1;

  const risks: VotingRisk[] = [];
  for (const m of memberRows) {
    const [twoMonthsAgo, oneMonthAgo, thisMonth] = counts.get(m.id) ?? [0, 0, 0];
    const checkinsThisMonth = thisMonth ?? 0;
    const shortfall = Math.max(0, REQUIRED_PER_MONTH - checkinsThisMonth);

    // Walk backward from the most recent month, counting the contiguous run
    // of below-threshold months. The current month only counts if recovery is
    // no longer possible (days remaining < shortfall). Any gap stops the run.
    let consecutive = 0;
    const currentIsLockedBelow =
      checkinsThisMonth < REQUIRED_PER_MONTH && daysRemaining < shortfall;
    if (currentIsLockedBelow) consecutive += 1;
    if ((oneMonthAgo ?? 0) < REQUIRED_PER_MONTH) {
      consecutive += 1;
      if ((twoMonthsAgo ?? 0) < REQUIRED_PER_MONTH) consecutive += 1;
    }

    // Flag criteria: at risk this month (can't reach 3), already below for past
    // month, or consecutive run that's hit the constitutional trigger.
    const atRiskThisMonth = checkinsThisMonth < REQUIRED_PER_MONTH && daysRemaining < shortfall;
    const flag = atRiskThisMonth || consecutive >= 1;
    if (!flag) continue;

    risks.push({
      member_id: m.id,
      name: m.name ?? m.full_name ?? null,
      checkinsThisMonth,
      shortfall,
      consecutiveMonthsBelow: consecutive,
    });
  }

  risks.sort((a, b) => {
    if (b.consecutiveMonthsBelow !== a.consecutiveMonthsBelow) {
      return b.consecutiveMonthsBelow - a.consecutiveMonthsBelow;
    }
    return b.shortfall - a.shortfall;
  });
  return risks;
}
