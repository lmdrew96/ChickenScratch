'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, AlertTriangle, Check, X, Hand, Save } from 'lucide-react';
import { recordAttendance } from '@/lib/actions/attendance';
import { formatTimeET } from '@/lib/format-date';
import type {
  AttendanceRecord,
  AttendanceStatus,
  MeetingToday,
  MemberRow,
  VotingRisk,
} from '@/lib/data/attendance-queries';

type Props = {
  meetings: MeetingToday[];
  members: MemberRow[];
  initialByMeeting: Record<string, AttendanceRecord[]>;
  risks: VotingRisk[];
};

function toMap(records: AttendanceRecord[]): Record<string, AttendanceStatus> {
  const m: Record<string, AttendanceStatus> = {};
  for (const r of records) m[r.member_id] = r.status;
  return m;
}

const STATUS_BUTTONS: Array<{ key: AttendanceStatus; label: string; icon: React.ComponentType<{ className?: string }>; tone: string }> = [
  { key: 'present', label: 'Present', icon: Check, tone: 'bg-emerald-400/20 border-emerald-400/40 text-emerald-200' },
  { key: 'excused', label: 'Excused', icon: Hand, tone: 'bg-amber-400/20 border-amber-400/40 text-amber-200' },
  { key: 'absent', label: 'Absent', icon: X, tone: 'bg-rose-400/20 border-rose-400/40 text-rose-200' },
];

export function AttendanceTaker({ meetings, members, initialByMeeting, risks }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(meetings[0]?.id ?? null);
  const [byMeeting, setByMeeting] = useState<Record<string, Record<string, AttendanceStatus>>>(() => {
    const out: Record<string, Record<string, AttendanceStatus>> = {};
    for (const [id, records] of Object.entries(initialByMeeting)) out[id] = toMap(records);
    return out;
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const active = meetings.find((m) => m.id === selectedId) ?? null;
  const current = selectedId ? byMeeting[selectedId] ?? {} : {};

  const setStatus = (memberId: string, status: AttendanceStatus) => {
    if (!selectedId) return;
    setByMeeting((prev) => ({
      ...prev,
      [selectedId]: { ...(prev[selectedId] ?? {}), [memberId]: status },
    }));
  };

  const save = () => {
    if (!selectedId) return;
    setError(null);
    const entries = Object.entries(current).map(([member_id, status]) => ({ member_id, status }));
    startTransition(async () => {
      const result = await recordAttendance({ meeting_id: selectedId, entries });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedAt(formatTimeET(new Date()));
      router.refresh();
    });
  };

  if (meetings.length === 0) {
    if (risks.length === 0) return null;
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-amber-400" />
          Attendance
        </h3>
        <p className="text-sm text-slate-400 mt-2">
          No meeting scheduled for today. The attendance taker returns the morning of a meeting.
        </p>
        <RisksPanel risks={risks} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-amber-400" />
          Take Attendance
        </h3>
        {meetings.length > 1 ? (
          <select
            value={selectedId ?? ''}
            onChange={(e) => setSelectedId(e.target.value || null)}
            className="rounded bg-white/10 border border-white/20 px-2 py-1.5 text-xs text-white"
          >
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        ) : (
          active && <span className="text-xs text-slate-400">{active.title}</span>
        )}
      </div>

      {members.length === 0 ? (
        <p className="text-sm text-slate-400">
          No active members found. Mark members via the admin panel before taking attendance.
        </p>
      ) : (
        <ul className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
          {members.map((member) => {
            const current = selectedId ? byMeeting[selectedId]?.[member.id] : undefined;
            const risk = risks.find((r) => r.member_id === member.id);
            return (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-2 rounded border border-white/10 bg-white/5 px-3 py-2 text-xs"
              >
                <span className="flex-1 min-w-0 truncate text-slate-200 flex items-center gap-2">
                  {member.name ?? member.email}
                  {risk && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      voting at risk ({risk.missedInMonth} missed)
                    </span>
                  )}
                </span>
                <div className="flex gap-1">
                  {STATUS_BUTTONS.map((b) => {
                    const Icon = b.icon;
                    const active = current === b.key;
                    return (
                      <button
                        key={b.key}
                        onClick={() => setStatus(member.id, b.key)}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold border min-h-[32px] ${
                          active
                            ? b.tone
                            : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                        }`}
                      >
                        <Icon className="h-3 w-3" />
                        <span className="hidden sm:inline">{b.label}</span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button
          onClick={save}
          disabled={pending || !selectedId || Object.keys(current).length === 0}
          className="inline-flex items-center gap-1 rounded bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {pending ? 'Saving…' : 'Save attendance'}
        </button>
        {savedAt && <span className="text-[11px] text-slate-400">Saved at {savedAt}</span>}
        {error && <span className="text-[11px] text-rose-300">{error}</span>}
      </div>

      <RisksPanel risks={risks} />
    </div>
  );
}

function RisksPanel({ risks }: { risks: VotingRisk[] }) {
  if (risks.length === 0) return null;
  return (
    <div className="mt-4 rounded border border-amber-400/30 bg-amber-400/5 p-3">
      <h4 className="text-xs font-semibold text-amber-200 flex items-center gap-1.5 mb-2">
        <AlertTriangle className="h-3.5 w-3.5" />
        Voting rights at risk this month
      </h4>
      <ul className="space-y-1 text-xs">
        {risks.map((r) => (
          <li key={r.member_id} className="flex flex-wrap items-center justify-between gap-2 text-amber-100">
            <span className="truncate">{r.name ?? 'Unnamed member'}</span>
            <span className="text-[11px] text-amber-200/80">
              {r.missedInMonth} missed this month
              {r.consecutivelyMissed >= 2 && ` · ${r.consecutivelyMissed} consecutive`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
