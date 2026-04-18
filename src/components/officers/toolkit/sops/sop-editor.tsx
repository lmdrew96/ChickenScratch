'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Eye, Pencil, Trash2 } from 'lucide-react';
import { updateSopArticle, deleteSopArticle } from '@/lib/actions/sops';
import { Markdown } from '@/components/ui/markdown';

type Props = {
  id: string;
  roleSlug: string;
  initialTitle: string;
  initialBody: string;
  initialTags: string[];
  initialIsDraft: boolean;
  startInEdit?: boolean;
};

export function SopEditor({
  id,
  roleSlug,
  initialTitle,
  initialBody,
  initialTags,
  initialIsDraft,
  startInEdit,
}: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(!!startInEdit);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [tags, setTags] = useState(initialTags.join(', '));
  const [isDraft, setIsDraft] = useState(initialIsDraft);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateSopArticle({
        id,
        title,
        body_md: body,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        is_draft: isDraft,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  const remove = () => {
    if (!window.confirm('Delete this SOP? This cannot be undone.')) return;
    startTransition(async () => {
      const result = await deleteSopArticle(id);
      if (result.ok) router.push(`/officers/toolkits/${roleSlug}/sops`);
    });
  };

  if (!editing) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 flex-wrap">
              {title}
              {isDraft && (
                <span className="text-[10px] uppercase tracking-wider text-amber-300 border border-amber-400/40 rounded px-1.5 py-0.5">
                  Draft
                </span>
              )}
            </h1>
            {initialTags.length > 0 && (
              <p className="text-xs text-slate-500 mt-1">{initialTags.join(' · ')}</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/30 border border-amber-400/40 min-h-[32px]"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
            <button
              onClick={remove}
              className="inline-flex items-center gap-1 rounded border border-rose-400/40 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-400/20 min-h-[32px]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
          </div>
        </div>
        <Markdown>{body || '_Empty article. Click Edit to start writing._'}</Markdown>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4 sm:p-6 shadow-lg space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs text-slate-300 flex-1 min-w-[200px]">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={isDraft}
            onChange={(e) => setIsDraft(e.target.checked)}
          />
          Mark as draft
        </label>
      </div>

      <label className="text-xs text-slate-300 block">
        Tags (comma-separated)
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. finance, treasurer"
          className="mt-1 w-full rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
        />
      </label>

      <label className="text-xs text-slate-300 block">
        Body (Markdown)
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={18}
          className="mt-1 w-full rounded bg-black/30 border border-white/20 px-3 py-2 text-sm text-white font-mono leading-relaxed"
        />
      </label>

      <details className="text-xs text-slate-400">
        <summary className="cursor-pointer hover:text-slate-200 flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" /> Preview
        </summary>
        <div className="mt-2 rounded border border-white/10 bg-white/5 p-3">
          <Markdown>{body || '_Nothing to preview._'}</Markdown>
        </div>
      </details>

      {error && <p className="text-xs text-rose-300">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-1 rounded bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setTitle(initialTitle);
            setBody(initialBody);
            setTags(initialTags.join(', '));
            setIsDraft(initialIsDraft);
          }}
          className="rounded border border-white/20 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
