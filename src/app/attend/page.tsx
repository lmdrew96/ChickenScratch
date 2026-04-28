import { and, eq, gte, lt } from 'drizzle-orm';
import { CheckCircle2 } from 'lucide-react';

import { CheckInButton } from '@/components/attendance/check-in-button';
import { requireUser } from '@/lib/auth/guards';
import { getCurrentUserRole } from '@/lib/actions/roles';
import { db } from '@/lib/db';
import { groupMeetingCheckins } from '@/lib/db/schema';
import {
  easternMonthBounds,
  easternWallClockToDate,
  toEasternDateString,
} from '@/lib/utils';
import { formatTimeET } from '@/lib/format-date';

export const metadata = {
  title: 'Check In · Hen & Ink Society',
  description: 'Self-service check-in for group meetings.',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default async function AttendPage() {
  const { profile } = await requireUser('/attend');
  const userRole = await getCurrentUserRole();

  const memberName =
    profile.full_name || profile.name || profile.email?.split('@')[0] || 'friend';

  if (!userRole?.is_member) {
    return <NotAMemberCard name={memberName} />;
  }

  // Today (ET) and this month's check-ins for this member.
  const now = new Date();
  const todayEt = toEasternDateString(now);
  const todayStart = easternWallClockToDate(todayEt, '00:00');
  const currentYear = Number(todayEt.slice(0, 4));
  const currentMonth = Number(todayEt.slice(5, 7));
  const { start: monthStart, end: monthEnd } = easternMonthBounds(currentYear, currentMonth);

  const [todayRows, monthRows] = await Promise.all([
    db()
      .select({
        id: groupMeetingCheckins.id,
        checked_in_at: groupMeetingCheckins.checked_in_at,
      })
      .from(groupMeetingCheckins)
      .where(
        and(
          eq(groupMeetingCheckins.member_id, profile.id),
          eq(groupMeetingCheckins.meeting_date, todayStart),
        ),
      )
      .limit(1),
    db()
      .select({ id: groupMeetingCheckins.id })
      .from(groupMeetingCheckins)
      .where(
        and(
          eq(groupMeetingCheckins.member_id, profile.id),
          gte(groupMeetingCheckins.meeting_date, monthStart),
          lt(groupMeetingCheckins.meeting_date, monthEnd),
        ),
      ),
  ]);

  const today = todayRows[0];
  const monthlyCount = monthRows.length;
  const monthName = MONTH_NAMES[currentMonth - 1];

  if (today) {
    return (
      <AttendShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2
            className="h-20 w-20 text-emerald-300"
            strokeWidth={1.5}
            aria-hidden
          />
          <p className="text-xl font-semibold text-white">
            You&apos;re checked in for today.
          </p>
          <p className="text-sm text-white/70">
            Recorded at {formatTimeET(today.checked_in_at)}
          </p>
          <div className="mt-4 rounded-lg bg-white/5 px-4 py-3 text-sm text-white/80">
            {monthlyCount >= 3 ? (
              <>
                <strong className="text-[var(--accent)]">
                  {monthlyCount}/3
                </strong>{' '}
                — you&apos;re all set for {monthName} 🐔
              </>
            ) : (
              <>
                <strong className="text-[var(--accent)]">
                  {monthlyCount}/3
                </strong>{' '}
                check-ins this {monthName}
              </>
            )}
          </div>
        </div>
      </AttendShell>
    );
  }

  return (
    <AttendShell>
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="text-sm text-white/60">{prettyDate(now)}</p>
        <h2 className="text-2xl font-bold text-white">
          Welcome, {memberName.split(' ')[0]}
        </h2>
        <p className="text-sm text-white/70">
          Tap to check in for today&apos;s meeting.
        </p>
        <CheckInButton monthlyCount={monthlyCount} monthName={monthName ?? ''} />
      </div>
    </AttendShell>
  );
}

function AttendShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[60vh] flex items-start sm:items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-[var(--brand)] p-6 sm:p-8 shadow-xl ring-1 ring-white/10">
        <div className="mb-4 flex items-center justify-center">
          <span className="font-guavine text-lg text-[var(--accent)]">
            Hen &amp; Ink Society
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

function NotAMemberCard({ name }: { name: string }) {
  return (
    <AttendShell>
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-xl font-bold text-white">Hi {name.split(' ')[0]} 👋</h2>
        <p className="text-sm text-white/80">
          You need to be a member of the Hen &amp; Ink Society to check in.
          Talk to an officer at the meeting and they&apos;ll get you set up!
        </p>
      </div>
    </AttendShell>
  );
}

function prettyDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
}
