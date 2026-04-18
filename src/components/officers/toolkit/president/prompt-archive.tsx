'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Plus, Check, Trash2, RotateCcw, Tag } from 'lucide-react';
import {
  createPrompt,
  markPromptUsed,
  markPromptUnused,
  deletePrompt,
} from '@/lib/actions/agenda';
import type { CreativePromptRow } from '@/lib/data/agenda-queries';

type Props = { prompts: CreativePromptRow[] };

function formatDate(d: Date | null): string {
  if (!d) return 'Never';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PromptArchive({ prompts }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'used' | 'unused'>('all');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [newTags, setNewTags] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    prompts.forEach((p) => p.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [prompts]);

  const filtered = prompts.filter((p) => {
    if (filter === 'used' && !p.last_used_at) return false;
    if (filter === 'unused' && p.last_used_at) return false;
    if (tagFilter && !p.tags.includes(tagFilter)) return false;
    return true;
  });

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newText.trim()) return;
    startTransition(async () => {
      const result = await createPrompt({
        text: newText,
        tags: newTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewText('');
      setNewTags('');
      router.refresh();
    });
  };

  const markUsed = (id: string) => {
    startTransition(async () => {
      await markPromptUsed(id);
      router.refresh();
    });
  };
  const markUnused = (id: string) => {
    startTransition(async () => {
      await markPromptUnused(id);
      router.refresh();
    });
  };
  const remove = (id: string) => {
    if (!window.confirm('Delete this prompt?')) return;
    startTransition(async () => {
      await deletePrompt(id);
      router.refresh();
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" />
          Prompt Archive
        </h3>
      </div>

      <form onSubmit={create} className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
        <label className="text-xs text-slate-300 block">
          New prompt
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={2}
            placeholder="Write or paste a prompt"
            className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
          />
        </label>
        <label className="text-xs text-slate-300 block">
          Tags (comma-separated — e.g. flash-fiction, poetry, visual-art)
          <input
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
          />
        </label>
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <button
          type="submit"
          disabled={pending || !newText.trim()}
          className="inline-flex items-center gap-1 rounded bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-60"
        >
          <Plus className="h-3.5 w-3.5" />
          Add prompt
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {(['all', 'used', 'unused'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-2.5 py-1 ${
              filter === f
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        {allTags.map((t) => (
          <button
            key={t}
            onClick={() => setTagFilter((cur) => (cur === t ? null : t))}
            className={`rounded-full border px-2.5 py-1 inline-flex items-center gap-1 ${
              tagFilter === t
                ? 'border-amber-400/40 bg-amber-400/10 text-amber-200'
                : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            <Tag className="h-3 w-3" />
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400">No prompts match. Seed one above.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li
              key={p.id}
              className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm space-y-1.5"
            >
              <p className="text-slate-200 whitespace-pre-wrap">{p.text}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                {p.tags.length > 0 && <span>{p.tags.join(' · ')}</span>}
                <span>
                  Last used: {formatDate(p.last_used_at)}
                  {p.first_used_at && p.last_used_at !== p.first_used_at && (
                    <> · first used {formatDate(p.first_used_at)}</>
                  )}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {p.last_used_at ? (
                  <button
                    onClick={() => markUnused(p.id)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/10 disabled:opacity-60"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Mark unused
                  </button>
                ) : (
                  <button
                    onClick={() => markUsed(p.id)}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-400/10 px-2 py-1 text-[11px] text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-60"
                  >
                    <Check className="h-3 w-3" />
                    Mark used today
                  </button>
                )}
                <button
                  onClick={() => remove(p.id)}
                  disabled={pending}
                  className="inline-flex items-center gap-1 rounded border border-rose-400/40 bg-rose-400/10 px-2 py-1 text-[11px] text-rose-200 hover:bg-rose-400/20 disabled:opacity-60"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
