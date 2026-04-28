'use client';

import { AlertTriangle, CheckCircle2, Trash2, Wrench } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { removeCheckIn } from '@/lib/actions/group-attendance';
import type {
  MonthlyAttendance,
  MonthlyAttendanceMember,
} from '@/lib/actions/group-attendance';

type Props = {
  data: MonthlyAttendance;
};

const STATUS_LABEL: Record<MonthlyAttendanceMember['status'], { label: string; tone: string }> = {
  on_track: { label: 'On track', tone: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30' },
  at_risk: { label: 'At risk', tone: 'bg-amber-400/15 text-amber-200 border-amber-400/40' },
  below_threshold: { label: 'Below 3', tone: 'bg-rose-500/15 text-rose-200 border-rose-400/40' },
};

export function AttendanceGrid({ data }: Props) {
  const [showAtRiskOnly, setShowAtRiskOnly] = useState(false);

  const filtered = useMemo(() => {
    if (!showAtRiskOnly) return data.members;
    return data.members.filter((m) => m.status !== 'on_track');
  }, [data.members, showAtRiskOnly]);

  // Compute the union of dates that appear in any member's check-ins, sorted ascending.
  const dateColumns = useMemo(() => {
    const set = new Set<string>();
    for (const m of data.members) {
      for (const c of m.checkins) set.add(c.date);
    }
    return Array.from(set).sort();
  }, [data.members]);

  if (data.members.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        No active members yet. Mark members in the admin panel to populate the grid.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          {data.members.length} member{data.members.length === 1 ? '' : 's'}
          {dateColumns.length > 0 && ` · ${dateColumns.length} day${dateColumns.length === 1 ? '' : 's'} with check-ins`}
        </p>
        <label className="inline-flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={showAtRiskOnly}
            onChange={(e) => setShowAtRiskOnly(e.target.checked)}
            className="rounded border-white/20"
          />
          At risk only
        </label>
      </div>

      {dateColumns.length === 0 ? (
        <p className="text-sm text-slate-400">No check-ins for this month yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-left text-slate-400">
                <th className="sticky left-0 bg-[var(--bg)] py-2 pr-3">Member</th>
                <th className="py-2 pr-3 whitespace-nowrap">Status</th>
                <th className="py-2 pr-3 text-center">Total</th>
                {dateColumns.map((d) => (
                  <th key={d} className="py-2 px-2 text-center whitespace-nowrap">
                    {formatDayHeader(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <MemberRow key={m.id} member={m} dateColumns={dateColumns} />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3 + dateColumns.length} className="py-6 text-center text-slate-400">
                    Nobody is at risk this month. 🎉
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  dateColumns,
}: {
  member: MonthlyAttendanceMember;
  dateColumns: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const checkinByDate = useMemo(() => {
    const m = new Map<string, { id: string; selfCheckin: boolean }>();
    for (const c of member.checkins) m.set(c.date, { id: c.id, selfCheckin: c.selfCheckin });
    return m;
  }, [member.checkins]);

  const onRemove = (checkinId: string, date: string) => {
    if (!confirm(`Remove ${member.name ?? 'this member'}'s check-in for ${formatDayHeader(date)}?`)) {
      return;
    }
    startTransition(async () => {
      const result = await removeCheckIn(checkinId);
      if (!result.ok) {
        alert(`Could not remove: ${result.error}`);
        return;
      }
      router.refresh();
    });
  };

  const status = STATUS_LABEL[member.status];

  return (
    <tr className="border-b border-white/5 hover:bg-white/5">
      <td className="sticky left-0 bg-[var(--bg)] py-2 pr-3 font-medium text-slate-100">
        <div className="flex items-center gap-1.5">
          <span className="truncate max-w-[140px]">{member.name ?? 'Unnamed'}</span>
          {member.isOfficer && (
            <span className="rounded bg-white/10 px-1 py-0.5 text-[9px] uppercase tracking-wider text-slate-300">
              officer
            </span>
          )}
        </div>
      </td>
      <td className="py-2 pr-3">
        <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] ${status.tone}`}>
          {member.status === 'at_risk' && <AlertTriangle className="h-3 w-3" aria-hidden />}
          {status.label}
        </span>
      </td>
      <td className="py-2 pr-3 text-center font-semibold tabular-nums text-slate-100">
        {member.totalThisMonth}
      </td>
      {dateColumns.map((d) => {
        const c = checkinByDate.get(d);
        if (!c) {
          return (
            <td key={d} className="py-2 px-2 text-center text-slate-600">
              ·
            </td>
          );
        }
        return (
          <td key={d} className="py-2 px-2 text-center">
            <button
              type="button"
              onClick={() => onRemove(c.id, d)}
              disabled={pending}
              title={`Remove check-in (${c.selfCheckin ? 'self' : 'officer override'})`}
              className="group inline-flex h-6 w-6 items-center justify-center rounded text-emerald-300 hover:bg-rose-500/20 hover:text-rose-200 disabled:opacity-50"
            >
              <span className="group-hover:hidden">
                {c.selfCheckin ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Wrench className="h-4 w-4 text-amber-300" />
                )}
              </span>
              <span className="hidden group-hover:inline">
                <Trash2 className="h-4 w-4" />
              </span>
            </button>
          </td>
        );
      })}
    </tr>
  );
}

function formatDayHeader(yyyymmdd: string): string {
  const [, m, d] = yyyymmdd.split('-');
  return `${Number(m)}/${Number(d)}`;
}
