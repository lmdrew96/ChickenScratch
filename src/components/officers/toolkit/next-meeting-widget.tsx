'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';
import type { MeetingSummary } from '@/lib/data/toolkit-queries';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  }).format(new Date(date));
}

function daysUntil(date: Date): string {
  const diff = new Date(date).getTime() - Date.now();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export function NextMeetingWidget({ meeting }: { meeting: MeetingSummary | null }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-emerald-400" />
        Next Meeting
      </h3>

      {!meeting ? (
        <div>
          <p className="text-sm text-slate-400 mb-3">No upcoming meetings — schedule one?</p>
          <Link
            href="/officers#meetings"
            className="text-sm text-[var(--accent)] hover:underline"
          >
            Schedule a meeting &rarr;
          </Link>
        </div>
      ) : meeting.is_finalized && meeting.finalized_date ? (
        <div>
          <p className="text-white font-medium mb-1">{meeting.title}</p>
          <p className="text-sm text-slate-300">{formatDate(meeting.finalized_date)}</p>
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
            {daysUntil(meeting.finalized_date)}
          </span>
          <div className="mt-3 pt-3 border-t border-white/10">
            <Link href="/officers#meetings" className="text-sm text-[var(--accent)] hover:underline">
              View meeting &rarr;
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-white font-medium mb-1">{meeting.title}</p>
          <p className="text-sm text-slate-400">
            Still scheduling — {meeting.proposed_dates.length} date option{meeting.proposed_dates.length !== 1 ? 's' : ''} proposed
          </p>
          <div className="mt-3 pt-3 border-t border-white/10">
            <Link href="/officers#meetings" className="text-sm text-[var(--accent)] hover:underline">
              Submit availability &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
