'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Save, Eye } from 'lucide-react';
import { saveAgenda } from '@/lib/actions/agenda';
import { Markdown } from '@/components/ui/markdown';
import type { NextMeetingForAgenda } from '@/lib/data/agenda-queries';
import { formatTimeET, formatWeekdayET } from '@/lib/format-date';

const DEFAULT_TEMPLATE = `# Agenda — [Meeting Date]

## Attendance & quorum check

## Minutes from last meeting

## Officer reports
- **President:**
- **Treasurer:**
- **Secretary:**
- **PR:**

## Old business

## New business

## Creative writing prompt
[Insert prompt]

## Announcements
`;

type Props = {
  meeting: NextMeetingForAgenda;
};

export function AgendaBuilder({ meeting }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState(meeting.draft_md || DEFAULT_TEMPLATE);
  const [savedAt, setSavedAt] = useState<string | null>(
    meeting.draft_md ? 'Loaded from last save' : null,
  );
  const [finalized, setFinalized] = useState(!!meeting.finalized_at);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!draft || draft === meeting.draft_md) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await saveAgenda({ meeting_id: meeting.id, draft_md: draft });
        if (result.ok) {
          setSavedAt(formatTimeET(new Date()));
          setError(null);
        } else {
          setError(result.error);
        }
      });
    }, 1200);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const finalize = () => {
    startTransition(async () => {
      const result = await saveAgenda({ meeting_id: meeting.id, draft_md: draft, finalize: true });
      if (result.ok) {
        setFinalized(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  const meetingLabel = meeting.finalized_date ? formatWeekdayET(meeting.finalized_date) : 'Unscheduled';

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <CalendarCheck className="h-5 w-5 text-amber-400" />
          Agenda Builder
        </h3>
        <span className="text-xs text-slate-400">
          {meeting.title} · {meetingLabel}
          {finalized && ' · Finalized'}
        </span>
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={16}
        className="w-full rounded bg-black/30 border border-white/20 px-3 py-2 text-sm text-white font-mono leading-relaxed"
      />

      <details className="mt-2 text-xs text-slate-400">
        <summary className="cursor-pointer hover:text-slate-200 flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" /> Preview
        </summary>
        <div className="mt-2 rounded border border-white/10 bg-white/5 p-3">
          <Markdown>{draft || '_Nothing to preview._'}</Markdown>
        </div>
      </details>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={finalize}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded bg-amber-400 px-3 py-1.5 font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {pending ? 'Saving…' : finalized ? 'Re-finalize' : 'Finalize agenda'}
        </button>
        {savedAt && !error && <span className="text-slate-400">Autosaved {savedAt}</span>}
        {error && <span className="text-rose-300">{error}</span>}
      </div>
    </div>
  );
}
