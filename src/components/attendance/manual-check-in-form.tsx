'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { manualCheckIn } from '@/lib/actions/group-attendance';

type Member = { id: string; name: string };

type Props = {
  members: Member[];
  defaultDate: string; // YYYY-MM-DD in ET
};

export function ManualCheckInForm({ members, defaultDate }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [memberId, setMemberId] = useState(members[0]?.id ?? '');
  const [date, setDate] = useState(defaultDate);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberId) {
      setMessage({ tone: 'err', text: 'Pick a member first.' });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await manualCheckIn(memberId, date, notes || undefined);
      if (!result.ok) {
        setMessage({ tone: 'err', text: result.error });
        return;
      }
      setMessage({
        tone: 'ok',
        text: result.alreadyCheckedIn
          ? 'Already had a check-in for that date — no change.'
          : 'Check-in recorded.',
      });
      setNotes('');
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <label className="block">
          <span className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
            Member
          </span>
          <select
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white"
          >
            {members.length === 0 ? (
              <option value="">No active members</option>
            ) : (
              members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))
            )}
          </select>
        </label>
        <label className="block">
          <span className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
            Date
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white"
            required
          />
        </label>
      </div>
      <label className="block">
        <span className="block text-xs uppercase tracking-wider text-slate-400 mb-1">
          Notes (optional)
        </span>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder='e.g. "forgot phone, signed in on paper"'
          className="w-full rounded border border-white/15 bg-white/5 px-2 py-1.5 text-sm text-white placeholder:text-slate-500"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !memberId}
          className="inline-flex items-center gap-1.5 rounded bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#003b72] hover:bg-[#e6bb00] disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {pending ? 'Recording…' : 'Add check-in'}
        </button>
        {message && (
          <span
            className={`text-xs ${message.tone === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}
            role={message.tone === 'err' ? 'alert' : undefined}
          >
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
