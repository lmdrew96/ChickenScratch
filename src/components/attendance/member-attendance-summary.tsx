import Link from 'next/link';
import { CheckCircle2, Circle, Sparkles } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const REQUIRED = 3;

type Props = {
  currentMonth: { year: number; month: number; count: number; dates: string[] };
  recentMonths: { year: number; month: number; count: number }[];
};

export function MemberAttendanceSummary({ currentMonth, recentMonths }: Props) {
  const { count, dates, month, year } = currentMonth;
  const hit = count >= REQUIRED;
  const monthName = MONTH_NAMES[month - 1] ?? '';

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Group Meeting Attendance</h2>
          <p className="text-xs text-slate-400">
            Article VIII requires 3 group meetings per calendar month for voting rights.
          </p>
        </div>
        <Link
          href="/attend"
          className="inline-flex items-center gap-1.5 rounded bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#003b72] hover:bg-[#e6bb00]"
        >
          Check in
        </Link>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold tabular-nums text-white">{count}</span>
          <span className="text-sm text-slate-400">/ 3 in {monthName}</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => {
            const filled = i < count;
            return filled ? (
              <CheckCircle2 key={i} className="h-6 w-6 text-emerald-300" />
            ) : (
              <Circle key={i} className="h-6 w-6 text-slate-600" />
            );
          })}
        </div>
        {hit && (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--accent)]">
            <Sparkles className="h-3.5 w-3.5" />
            Met the minimum
          </span>
        )}
      </div>

      {dates.length > 0 && (
        <div className="mt-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">
            This month&apos;s check-ins
          </p>
          <ul className="flex flex-wrap gap-1.5 text-xs">
            {dates.map((d) => (
              <li
                key={d}
                className="rounded border border-white/10 bg-white/5 px-2 py-1 text-slate-200"
              >
                {formatDate(d)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 border-t border-white/10 pt-3">
        <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">Recent months</p>
        <ul className="flex flex-wrap gap-3 text-xs">
          {recentMonths.map((m) => {
            const tone =
              m.count >= REQUIRED
                ? 'text-emerald-300'
                : m.year === year && m.month === month
                ? 'text-slate-300'
                : 'text-rose-300';
            return (
              <li key={`${m.year}-${m.month}`} className="text-slate-400">
                {MONTH_NAMES_SHORT[m.month - 1]}{' '}
                <span className={`font-semibold ${tone}`}>{m.count}/3</span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function formatDate(yyyymmdd: string): string {
  const [, m, d] = yyyymmdd.split('-');
  return `${MONTH_NAMES_SHORT[Number(m) - 1]} ${Number(d)}`;
}
