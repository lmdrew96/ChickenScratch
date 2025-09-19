'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import useToast from '@/components/ui/toast';
import { useSupabase as useSupabaseCtx } from '@/components/providers/supabase-provider';

export type MineClientProps = {
  submissions: Array<{
    id: string;
    title: string | null;
    type?: string | null;
    status?: string | null;
    created_at?: string | null;
  }>;
  viewerName: string;
};

export default function MineClient({ submissions, viewerName }: MineClientProps) {
  const router = useRouter();
  const { notify } = useToast();

  // Prefer context-provided client; gracefully fall back to direct client
  let supabase: ReturnType<typeof createClient> | null = null;
  try {
    // @ts-expect-error runtime check for function
    if (typeof useSupabaseCtx === 'function') {
      // @ts-ignore
      supabase = useSupabaseCtx();
    }
  } catch {
    supabase = null;
  }
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
    if (url && anon) supabase = createClient(url, anon);
  }

  const [selectedId, setSelectedId] = useState<string | null>(submissions?.[0]?.id ?? null);
  const filtered = useMemo(() => Array.isArray(submissions) ? submissions : [], [submissions]);
  const selected = useMemo(() => filtered.find((s) => s.id === selectedId) ?? filtered[0] ?? null, [filtered, selectedId]);

  async function refreshMine() {
    router.refresh();
  }

  async function downloadPath(path: string) {
    if (!supabase) {
      notify({ title: 'Download failed', description: 'Supabase client unavailable.', variant: 'error' });
      return;
    }
    try {
      const { data, error } = await supabase.storage.from('art').createSignedUrl(path, 60 * 10);
      if (error || !data?.signedUrl) throw error ?? new Error('No URL');
      window.open(data.signedUrl, '_blank');
    } catch (err: any) {
      notify({ title: 'Download failed', description: err?.message ?? 'Unknown error', variant: 'error' });
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Your submissions, {viewerName}</h2>
      <ul className="divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10">
        {filtered.length === 0 && <li className="p-3 text-sm text-white/60">No submissions yet.</li>}
        {filtered.map((s) => (
          <li key={s.id} className={`p-3 ${selectedId === s.id ? 'bg-white/10' : ''}`} onClick={() => setSelectedId(s.id)}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white">{s.title ?? '(untitled)'}</div>
                <div className="text-xs text-white/60">{(s.type ?? 'writing').toString()} • {(s.status ?? 'submitted').toString()}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); refreshMine(); }}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-white hover:bg-white/10"
              >Refresh</button>
            </div>
          </li>
        ))}
      </ul>

      {selected && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/80">
            <span className="text-white/60">Status:</span> {(selected.status ?? 'submitted').toString()}
          </div>
          {/* Example attachment download (replace with your real path field) */}
          <div className="mt-3 text-xs text-white/60">Attachments: (sample) </div>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => downloadPath(`art/${selected.id}/sample.txt`)}
              className="rounded-md border border-cyan-700/40 bg-cyan-900/30 px-3 py-2 text-sm text-cyan-200 hover:bg-cyan-900/40"
            >
              Download sample
            </button>
          </div>
        </div>
      )}
    </div>
  );
}