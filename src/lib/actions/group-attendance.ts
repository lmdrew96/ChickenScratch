'use server';

import { and, asc, eq, gte, lt } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/lib/db';
import { groupMeetingCheckins, profiles, userRoles } from '@/lib/db/schema';
import { hasOfficerAccess, requireMemberRole, requireOfficerRole } from '@/lib/auth/guards';
import { getCurrentUserRole } from '@/lib/actions/roles';
import { rateLimit } from '@/lib/rate-limit';
import { easternMonthBounds, easternWallClockToDate, toEasternDateString } from '@/lib/utils';

export type CheckInStatus = 'on_track' | 'at_risk' | 'below_threshold';

export type MonthlyAttendanceEntry = {
  id: string;
  date: string; // YYYY-MM-DD in ET
  selfCheckin: boolean;
};

export type MonthlyAttendanceMember = {
  id: string;
  name: string | null;
  isOfficer: boolean;
  checkins: MonthlyAttendanceEntry[];
  totalThisMonth: number;
  status: CheckInStatus;
};

export type MonthlyAttendance = {
  members: MonthlyAttendanceMember[];
  month: number; // 1-12
  year: number;
};

export type MemberAttendanceSummary = {
  memberId: string;
  currentMonth: { year: number; month: number; count: number; dates: string[] };
  recentMonths: { year: number; month: number; count: number }[]; // last 3 calendar months including current
};

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ET_MIDNIGHT = '00:00';

// Normalize a YYYY-MM-DD (or any Date-parseable string) to start-of-day ET.
function normalizeToEtStartOfDay(input: string): Date | null {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(input)
    ? input
    : (() => {
        const d = new Date(input);
        return Number.isNaN(d.getTime()) ? null : toEasternDateString(d);
      })();
  if (!dateOnly) return null;
  return easternWallClockToDate(dateOnly, ET_MIDNIGHT);
}

function todayEtStartOfDay(now: Date = new Date()): Date {
  return easternWallClockToDate(toEasternDateString(now), ET_MIDNIGHT);
}

function computeStatus(
  count: number,
  year: number,
  month: number,
  now: Date = new Date(),
): CheckInStatus {
  const REQUIRED = 3;
  if (count >= REQUIRED) return 'on_track';

  const today = toEasternDateString(now); // YYYY-MM-DD
  const thisYear = Number(today.slice(0, 4));
  const thisMonth = Number(today.slice(5, 7));
  const targetIsPast =
    year < thisYear || (year === thisYear && month < thisMonth);
  const targetIsFuture =
    year > thisYear || (year === thisYear && month > thisMonth);

  if (targetIsPast) return 'below_threshold';
  if (targetIsFuture) return 'on_track';

  // Current month — count remaining opportunities (today through end of month)
  const todayDay = Number(today.slice(8, 10));
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const daysRemaining = lastDayOfMonth - todayDay + 1; // includes today
  const needed = REQUIRED - count;
  return daysRemaining >= needed ? 'on_track' : 'at_risk';
}

// ---------------------------------------------------------------------------
// Server actions
// ---------------------------------------------------------------------------

export async function checkIn(): Promise<Result<{ alreadyCheckedIn: boolean }>> {
  const { profile } = await requireMemberRole('/attend');

  const limited = rateLimit(`groupcheckin:${profile.id}`, { windowMs: 60_000, max: 10 });
  if (!limited.success) {
    return { ok: false, error: 'Too many check-in attempts. Try again in a minute.' };
  }

  try {
    const meetingDate = todayEtStartOfDay();
    const inserted = await db()
      .insert(groupMeetingCheckins)
      .values({
        member_id: profile.id,
        meeting_date: meetingDate,
        recorded_by: null,
      })
      .onConflictDoNothing({
        target: [groupMeetingCheckins.member_id, groupMeetingCheckins.meeting_date],
      })
      .returning({ id: groupMeetingCheckins.id });

    revalidatePath('/attend');
    revalidatePath('/mine');
    return { ok: true, alreadyCheckedIn: inserted.length === 0 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Check-in failed' };
  }
}

export async function manualCheckIn(
  memberId: string,
  dateStr: string,
  notes?: string,
): Promise<Result<{ alreadyCheckedIn: boolean }>> {
  const { profile } = await requireOfficerRole();
  if (!memberId || !dateStr) {
    return { ok: false, error: 'Member and date are required' };
  }

  const meetingDate = normalizeToEtStartOfDay(dateStr);
  if (!meetingDate) {
    return { ok: false, error: 'Invalid date' };
  }

  // Verify target is a current member.
  const target = await db()
    .select({ id: userRoles.user_id, is_member: userRoles.is_member })
    .from(userRoles)
    .where(eq(userRoles.user_id, memberId))
    .limit(1);
  if (!target[0] || !target[0].is_member) {
    return { ok: false, error: 'Selected user is not a current member' };
  }

  try {
    const inserted = await db()
      .insert(groupMeetingCheckins)
      .values({
        member_id: memberId,
        meeting_date: meetingDate,
        recorded_by: profile.id,
        notes: notes?.trim() ? notes.trim() : null,
      })
      .onConflictDoNothing({
        target: [groupMeetingCheckins.member_id, groupMeetingCheckins.meeting_date],
      })
      .returning({ id: groupMeetingCheckins.id });

    revalidatePath('/officers/attendance');
    return { ok: true, alreadyCheckedIn: inserted.length === 0 };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Manual check-in failed' };
  }
}

export async function removeCheckIn(
  checkinId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireOfficerRole();
  if (!checkinId) {
    return { ok: false, error: 'Check-in id is required' };
  }
  try {
    const deleted = await db()
      .delete(groupMeetingCheckins)
      .where(eq(groupMeetingCheckins.id, checkinId))
      .returning({ id: groupMeetingCheckins.id });
    if (deleted.length === 0) {
      return { ok: false, error: 'Check-in not found' };
    }
    revalidatePath('/officers/attendance');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Remove failed' };
  }
}

export async function getMonthlyAttendance(
  year: number,
  month: number,
): Promise<MonthlyAttendance> {
  await requireOfficerRole();
  const { start, end } = easternMonthBounds(year, month);

  // All current members (with role context for officer flag).
  const memberRows = await db()
    .select({
      id: profiles.id,
      name: profiles.name,
      full_name: profiles.full_name,
      email: profiles.email,
      positions: userRoles.positions,
      roles: userRoles.roles,
    })
    .from(profiles)
    .innerJoin(userRoles, eq(userRoles.user_id, profiles.id))
    .where(eq(userRoles.is_member, true))
    .orderBy(asc(profiles.name));

  // All check-ins in the month.
  const checkinRows = await db()
    .select({
      id: groupMeetingCheckins.id,
      member_id: groupMeetingCheckins.member_id,
      meeting_date: groupMeetingCheckins.meeting_date,
      recorded_by: groupMeetingCheckins.recorded_by,
    })
    .from(groupMeetingCheckins)
    .where(
      and(
        gte(groupMeetingCheckins.meeting_date, start),
        lt(groupMeetingCheckins.meeting_date, end),
      ),
    )
    .orderBy(asc(groupMeetingCheckins.meeting_date));

  const byMember = new Map<string, MonthlyAttendanceEntry[]>();
  for (const row of checkinRows) {
    if (!byMember.has(row.member_id)) byMember.set(row.member_id, []);
    byMember.get(row.member_id)!.push({
      id: row.id,
      date: toEasternDateString(row.meeting_date),
      selfCheckin: row.recorded_by === null,
    });
  }

  const members: MonthlyAttendanceMember[] = memberRows.map((m) => {
    const checkins = byMember.get(m.id) ?? [];
    const totalThisMonth = checkins.length;
    return {
      id: m.id,
      name: m.name ?? m.full_name ?? m.email,
      isOfficer: hasOfficerAccess(m.positions, m.roles),
      checkins,
      totalThisMonth,
      status: computeStatus(totalThisMonth, year, month),
    };
  });

  return { members, month, year };
}

export async function getMemberAttendanceSummary(
  memberId?: string,
): Promise<Result<MemberAttendanceSummary>> {
  const { profile } = await requireMemberRole();
  const targetId = memberId ?? profile.id;

  if (targetId !== profile.id) {
    const role = await getCurrentUserRole();
    if (!role || !hasOfficerAccess(role.positions, role.roles)) {
      return { ok: false, error: 'Forbidden' };
    }
  }

  const todayEt = toEasternDateString(new Date());
  const [yearStr, monthStr] = todayEt.split('-');
  const currentYear = Number(yearStr);
  const currentMonth = Number(monthStr);

  // Window covering the current month and the two previous calendar months.
  const earliest = (() => {
    let m = currentMonth - 2;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    return easternMonthBounds(y, m);
  })();
  const { end: windowEnd } = easternMonthBounds(currentYear, currentMonth);

  const rows = await db()
    .select({ meeting_date: groupMeetingCheckins.meeting_date })
    .from(groupMeetingCheckins)
    .where(
      and(
        eq(groupMeetingCheckins.member_id, targetId),
        gte(groupMeetingCheckins.meeting_date, earliest.start),
        lt(groupMeetingCheckins.meeting_date, windowEnd),
      ),
    )
    .orderBy(asc(groupMeetingCheckins.meeting_date));

  // Group by year+month.
  const buckets = new Map<string, string[]>(); // key "YYYY-MM" → list of YYYY-MM-DD
  for (const row of rows) {
    const ymd = toEasternDateString(row.meeting_date);
    const ym = ymd.slice(0, 7);
    if (!buckets.has(ym)) buckets.set(ym, []);
    buckets.get(ym)!.push(ymd);
  }

  const recentMonths: { year: number; month: number; count: number }[] = [];
  for (let i = 0; i < 3; i += 1) {
    let m = currentMonth - i;
    let y = currentYear;
    while (m <= 0) {
      m += 12;
      y -= 1;
    }
    const key = `${y}-${String(m).padStart(2, '0')}`;
    recentMonths.push({ year: y, month: m, count: buckets.get(key)?.length ?? 0 });
  }

  const currentKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  const currentDates = buckets.get(currentKey) ?? [];

  return {
    ok: true,
    memberId: targetId,
    currentMonth: {
      year: currentYear,
      month: currentMonth,
      count: currentDates.length,
      dates: currentDates,
    },
    recentMonths,
  };
}
