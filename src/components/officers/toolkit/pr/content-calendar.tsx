'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import {
  upsertPrPost,
  transitionPrPostStatus,
  deletePrPost,
} from '@/lib/actions/pr-posts';
import type { PrPostRow, PrPostStatus } from '@/lib/data/pr-post-queries';

const TEMPLATES = [
  {
    key: 'meet-the-flock',
    label: 'Meet the Flock',
    title: 'Meet the Flock: [Name]',
    body: `## Meet the Flock

[Name] is a [year / major] who joined Hen & Ink because [reason]. They love
[genre/medium], and you can find their work in [issue number].

Say hi at the next meeting — Thursdays at 6:30 in [room].`,
    channels: ['Instagram', 'Discord'],
  },
  {
    key: 'issue-release',
    label: 'Issue release',
    title: 'Chicken Scratch — Issue [N] is here',
    body: `## 📖 New issue drop

Chicken Scratch Issue [N] is now live. [Cover blurb — 1–2 sentences on the
theme or standout piece.]

- Digital: [linktree URL]
- Print: pick one up on Morris / Perkins / Memorial

Thank you to every contributor, proofreader, and member who made this happen.`,
    channels: ['Instagram', 'Discord', 'Email'],
  },
  {
    key: 'meeting-reminder',
    label: 'Meeting reminder',
    title: 'Reminder: meeting [day] at [time]',
    body: `## Reminder

[Day] at [time] in [room]. [One-line hook or prompt preview.]

See you there.`,
    channels: ['Discord'],
  },
  {
    key: 'event-promo',
    label: 'Event promo',
    title: '[Event name] — [date]',
    body: `## Event

[One-line hook].

- **Where:** [location]
- **When:** [date, time]
- **What to bring:** [if anything]

Tag a friend who needs to be there.`,
    channels: ['Instagram', 'Discord'],
  },
];

const STATUS_ORDER: PrPostStatus[] = ['empty', 'drafted', 'scheduled', 'posted'];
const STATUS_LABELS: Record<PrPostStatus, string> = {
  empty: 'Empty',
  drafted: 'Drafted',
  scheduled: 'Scheduled',
  posted: 'Posted',
};
const STATUS_TONES: Record<PrPostStatus, string> = {
  empty: 'border-white/10 bg-white/5 text-slate-400',
  drafted: 'border-amber-400/30 bg-amber-400/5 text-amber-200',
  scheduled: 'border-blue-400/30 bg-blue-400/5 text-blue-200',
  posted: 'border-emerald-400/30 bg-emerald-400/5 text-emerald-200',
};

function formatDay(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

type Props = {
  slots: string[]; // ISO strings
  posts: PrPostRow[];
};

export function ContentCalendar({ slots, posts }: Props) {
  const router = useRouter();
  const postBySlot = new Map<string, PrPostRow>();
  for (const p of posts) {
    const key = p.scheduled_for.toISOString();
    postBySlot.set(key, p);
  }

  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: '',
    body: '',
    channels: ['Instagram', 'Discord'] as string[],
    template: '' as string | null,
  });
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const openEditor = (slotIso: string) => {
    const existing = postBySlot.get(slotIso);
    setEditingSlot(slotIso);
    setEditingId(existing?.id ?? null);
    if (existing) {
      setDraft({
        title: existing.title ?? '',
        body: existing.draft_text ?? '',
        channels: existing.channels,
        template: existing.template ?? null,
      });
    } else {
      setDraft({ title: '', body: '', channels: ['Instagram', 'Discord'], template: null });
    }
  };

  const applyTemplate = (key: string) => {
    const tpl = TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    setDraft({ title: tpl.title, body: tpl.body, channels: tpl.channels, template: key });
  };

  const save = (targetStatus: PrPostStatus) => {
    if (!editingSlot) return;
    setError(null);
    startTransition(async () => {
      const result = await upsertPrPost({
        id: editingId ?? undefined,
        scheduled_for: editingSlot,
        status: targetStatus,
        title: draft.title || undefined,
        draft_text: draft.body || undefined,
        channels: draft.channels,
        template: draft.template ?? null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditingSlot(null);
      setEditingId(null);
      router.refresh();
    });
  };

  const transition = (id: string, status: PrPostStatus) => {
    startTransition(async () => {
      await transitionPrPostStatus({ id, status });
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (!window.confirm('Delete this post draft?')) return;
    startTransition(async () => {
      await deletePrPost(id);
      setEditingSlot(null);
      setEditingId(null);
      router.refresh();
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-amber-400" />
          Content Calendar
        </h3>
        <span className="text-xs text-slate-400">Mon / Wed / Fri · next 3 weeks</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {slots.map((iso) => {
          const date = new Date(iso);
          const post = postBySlot.get(iso);
          const status = post?.status ?? 'empty';
          const tone = STATUS_TONES[status];
          return (
            <button
              key={iso}
              onClick={() => openEditor(iso)}
              className={`rounded-xl border ${tone} p-3 text-left min-h-[96px] hover:opacity-90`}
            >
              <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
                <span className="font-semibold">{formatDay(date)}</span>
                <span className="uppercase tracking-wider">{STATUS_LABELS[status]}</span>
              </div>
              <p className="text-sm text-white line-clamp-2">
                {post?.title ?? (post?.draft_text ? post.draft_text.slice(0, 60) : 'Tap to plan')}
              </p>
              {post && post.channels.length > 0 && (
                <p className="mt-1 text-[10px] text-slate-400">{post.channels.join(' · ')}</p>
              )}
            </button>
          );
        })}
      </div>

      {editingSlot && (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-300">
              <span className="font-semibold text-white">Slot:</span>{' '}
              {formatDay(new Date(editingSlot))}
            </p>
            {editingId && (
              <button
                onClick={() => remove(editingId)}
                className="inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TEMPLATES.map((tpl) => (
              <button
                key={tpl.key}
                onClick={() => applyTemplate(tpl.key)}
                className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/10"
              >
                {tpl.label}
              </button>
            ))}
          </div>

          <label className="text-xs text-slate-300 block">
            Title
            <input
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
            />
          </label>
          <label className="text-xs text-slate-300 block">
            Body (Markdown allowed)
            <textarea
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              rows={10}
              className="mt-1 w-full rounded bg-black/30 border border-white/20 px-3 py-2 text-sm text-white font-mono"
            />
          </label>
          <div className="flex flex-wrap gap-2 text-xs">
            {['Instagram', 'Discord', 'Email', 'Linktree'].map((ch) => {
              const active = draft.channels.includes(ch);
              return (
                <label
                  key={ch}
                  className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 cursor-pointer ${
                    active
                      ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                      : 'border-white/10 bg-white/5 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => {
                      setDraft((d) => ({
                        ...d,
                        channels: e.target.checked
                          ? [...d.channels, ch]
                          : d.channels.filter((c) => c !== ch),
                      }));
                    }}
                  />
                  {ch}
                </label>
              );
            })}
          </div>

          {error && <p className="text-xs text-rose-300">{error}</p>}

          <div className="flex flex-wrap gap-2">
            {STATUS_ORDER.filter((s) => s !== 'empty').map((s) => (
              <button
                key={s}
                onClick={() => save(s)}
                disabled={pending}
                className={`rounded px-3 py-1.5 text-xs font-semibold border min-h-[32px] ${
                  STATUS_TONES[s]
                } hover:opacity-90 disabled:opacity-60`}
              >
                Save as {STATUS_LABELS[s]}
              </button>
            ))}
            <button
              onClick={() => {
                setEditingSlot(null);
                setEditingId(null);
              }}
              className="rounded border border-white/20 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
