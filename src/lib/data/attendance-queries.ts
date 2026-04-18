import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  meetingAttendance,
  meetingProposals,
  profiles,
  userRoles,
} from '@/lib/db/schema';

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
  missedInMonth: number;
  consecutivelyMissed: number;
};

export async function getVotingRightsAtRisk(now: Date = new Date()): Promise<VotingRisk[]> {
  // Article VIII: 3 misses in a rolling calendar month => voting rights revoked.
  // 2 consecutive months missing entirely => membership loss territory.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const rows = await db()
    .select({
      member_id: meetingAttendance.member_id,
      status: meetingAttendance.status,
      recorded_at: meetingAttendance.recorded_at,
      meeting_date: meetingProposals.finalized_date,
      name: profiles.name,
      full_name: profiles.full_name,
    })
    .from(meetingAttendance)
    .innerJoin(meetingProposals, eq(meetingAttendance.meeting_id, meetingProposals.id))
    .leftJoin(profiles, eq(meetingAttendance.member_id, profiles.id))
    .where(gte(meetingProposals.finalized_date, monthStart))
    .orderBy(desc(meetingProposals.finalized_date));

  const byMember = new Map<string, { name: string | null; missed: number; consecutive: number }>();
  const allByMember = new Map<string, Array<{ status: string; meeting_date: Date | null }>>();

  for (const row of rows) {
    if (!allByMember.has(row.member_id)) allByMember.set(row.member_id, []);
    allByMember.get(row.member_id)!.push({ status: row.status, meeting_date: row.meeting_date });
  }

  for (const [memberId, records] of allByMember) {
    records.sort((a, b) => (b.meeting_date?.getTime() ?? 0) - (a.meeting_date?.getTime() ?? 0));
    const missed = records.filter((r) => r.status === 'absent').length;
    let consecutive = 0;
    for (const r of records) {
      if (r.status === 'absent') consecutive += 1;
      else break;
    }
    const sample = rows.find((r) => r.member_id === memberId);
    byMember.set(memberId, {
      name: sample?.name ?? sample?.full_name ?? null,
      missed,
      consecutive,
    });
  }

  const at = Array.from(byMember.entries())
    .filter(([, v]) => v.missed >= 2 || v.consecutive >= 2)
    .map(([member_id, v]) => ({
      member_id,
      name: v.name,
      missedInMonth: v.missed,
      consecutivelyMissed: v.consecutive,
    }));
  at.sort((a, b) => b.missedInMonth - a.missedInMonth);
  return at;
}
