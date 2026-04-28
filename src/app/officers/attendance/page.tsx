import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { AlertTriangle, ChevronLeft, ChevronRight, Wrench } from 'lucide-react';

import PageHeader from '@/components/shell/page-header';
import { AttendanceGrid } from '@/components/attendance/attendance-grid';
import { ManualCheckInForm } from '@/components/attendance/manual-check-in-form';
import { QrCodeCard } from '@/components/attendance/qr-code-card';
import { requireOfficerRole } from '@/lib/auth/guards';
import { getMonthlyAttendance } from '@/lib/actions/group-attendance';
import { getVotingRightsAtRisk } from '@/lib/data/attendance-queries';
import { db } from '@/lib/db';
import { profiles, userRoles } from '@/lib/db/schema';
import { toEasternDateString } from '@/lib/utils';

export const metadata = {
  title: 'Group Attendance · Officers',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type SearchParams = Promise<{ year?: string; month?: string }>;

export default async function OfficerAttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireOfficerRole('/officers/attendance');
  const sp = await searchParams;

  const todayEt = toEasternDateString(new Date());
  const defaultYear = Number(todayEt.slice(0, 4));
  const defaultMonth = Number(todayEt.slice(5, 7));

  const year = sanitizeYear(sp.year, defaultYear);
  const month = sanitizeMonth(sp.month, defaultMonth);

  const [data, risks, memberRows] = await Promise.all([
    getMonthlyAttendance(year, month),
    getVotingRightsAtRisk(),
    db()
      .select({
        id: profiles.id,
        name: profiles.name,
        full_name: profiles.full_name,
        email: profiles.email,
      })
      .from(profiles)
      .innerJoin(userRoles, eq(userRoles.user_id, profiles.id))
      .where(eq(userRoles.is_member, true)),
  ]);

  const memberOptions = memberRows
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.full_name ?? m.email ?? 'Unnamed',
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const expulsionRisks = risks.filter((r) => r.consecutiveMonthsBelow >= 2);

  const { prev, next } = adjacentMonths(year, month);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Group Attendance"
        description="Self-service check-ins from /attend, plus officer manual overrides. Article VIII voting threshold is 3 group meetings per calendar month."
      />

      {expulsionRisks.length > 0 && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-rose-200">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            Membership at risk (Article VIII)
          </h2>
          <ul className="mt-2 space-y-1 text-xs text-rose-100">
            {expulsionRisks.map((r) => (
              <li key={r.member_id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{r.name ?? 'Unnamed member'}</span>
                <span className="text-rose-200/80">
                  {r.consecutiveMonthsBelow} consecutive months below the 3-meeting minimum
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <div className="flex items-center gap-1 text-xs">
            <Link
              href={`/officers/attendance?year=${prev.year}&month=${prev.month}`}
              className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-1 hover:bg-white/10"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {MONTH_NAMES[prev.month - 1]}
            </Link>
            <Link
              href="/officers/attendance"
              className="rounded border border-white/15 bg-white/5 px-2 py-1 hover:bg-white/10"
            >
              Today
            </Link>
            <Link
              href={`/officers/attendance?year=${next.year}&month=${next.month}`}
              className="inline-flex items-center gap-1 rounded border border-white/15 bg-white/5 px-2 py-1 hover:bg-white/10"
            >
              {MONTH_NAMES[next.month - 1]}
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
        <AttendanceGrid data={data} />
        <p className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <span className="text-emerald-300">✓</span> self check-in
          </span>
          <span className="inline-flex items-center gap-1">
            <Wrench className="h-3 w-3 text-amber-300" /> officer override
          </span>
          <span>Hover a check-in to remove it.</span>
        </p>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
        <h2 className="text-lg font-semibold text-white mb-3">Add a manual check-in</h2>
        <p className="text-xs text-slate-400 mb-4">
          Use when a member showed up but couldn&apos;t scan (forgot phone, signed in on paper, etc.).
        </p>
        <ManualCheckInForm members={memberOptions} defaultDate={todayEt} />
      </section>

      <QrCodeCard />
    </div>
  );
}

function sanitizeYear(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const n = Number(input);
  if (!Number.isInteger(n) || n < 2020 || n > 2100) return fallback;
  return n;
}

function sanitizeMonth(input: string | undefined, fallback: number): number {
  if (!input) return fallback;
  const n = Number(input);
  if (!Number.isInteger(n) || n < 1 || n > 12) return fallback;
  return n;
}

function adjacentMonths(year: number, month: number) {
  const prev = month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return { prev, next };
}
