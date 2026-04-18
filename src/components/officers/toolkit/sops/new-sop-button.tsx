'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { createSopArticle } from '@/lib/actions/sops';

export function NewSopButton({ roleSlug }: { roleSlug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createSopArticle({ role_slug: roleSlug, title, is_draft: true });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setTitle('');
      router.push(`/officers/toolkits/${roleSlug}/sops/${result.slug}?edit=1`);
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/30 border border-amber-400/40 min-h-[32px]"
      >
        <Plus className="h-3.5 w-3.5" />
        New SOP
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="SOP title"
        className="rounded bg-white/10 border border-white/20 px-2 py-1.5 text-sm text-white"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="rounded bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-300 disabled:opacity-60"
      >
        Create
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setTitle('');
        }}
        className="rounded border border-white/20 px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5"
      >
        Cancel
      </button>
      {error && <p className="text-xs text-rose-300">{error}</p>}
    </form>
  );
}
