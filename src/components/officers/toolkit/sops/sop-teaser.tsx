import Link from 'next/link';
import { BookOpen, ArrowRight, FileText } from 'lucide-react';
import type { SopArticleRow } from '@/lib/data/sop-queries';

type Props = {
  roleSlug: string;
  recent: SopArticleRow[];
};

export function SopTeaser({ roleSlug, recent }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-amber-400" />
          SOPs &amp; Knowledge Base
        </h3>
        <Link
          href={`/officers/toolkits/${roleSlug}/sops`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-amber-300 hover:text-amber-200"
        >
          Open library
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {recent.length === 0 ? (
        <p className="text-sm text-slate-400">
          This library is empty. Capture institutional knowledge here so your successor doesn't
          have to email the advisor at midnight.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {recent.slice(0, 5).map((a) => (
            <li key={a.id}>
              <Link
                href={`/officers/toolkits/${roleSlug}/sops/${a.slug}`}
                className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-200 hover:bg-white/5"
              >
                <FileText className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="flex-1 truncate">{a.title}</span>
                {a.is_draft && (
                  <span className="text-[10px] uppercase tracking-wider text-amber-300">
                    Draft
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
