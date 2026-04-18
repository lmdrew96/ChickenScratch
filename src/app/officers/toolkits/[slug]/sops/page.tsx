import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BookOpen, FileText, Plus } from 'lucide-react';

import PageHeader from '@/components/shell/page-header';
import { officerToolkits } from '@/lib/data/toolkits';
import { requireOfficerRole } from '@/lib/auth/guards';
import { listSopsForRole } from '@/lib/data/sop-queries';
import { NewSopButton } from '@/components/officers/toolkit/sops/new-sop-button';

export default async function SopListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireOfficerRole(`/officers/toolkits/${slug}/sops`);
  const toolkit = officerToolkits.find((t) => t.slug === slug);
  if (!toolkit) notFound();

  const articles = await listSopsForRole(slug);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${toolkit.title} SOP Library`}
        description="Institutional knowledge that survives officer turnover."
        showBackButton
        backButtonHref={`/officers/toolkits/${slug}`}
        backButtonLabel="Back to Toolkit"
      />

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-400" />
            Articles
          </h2>
          <NewSopButton roleSlug={slug} />
        </div>

        {articles.length === 0 ? (
          <p className="text-sm text-slate-400">
            No SOPs yet. Seed this library with the patterns you keep re-explaining — future-you
            will thank you.
          </p>
        ) : (
          <ul className="space-y-2">
            {articles.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/officers/toolkits/${slug}/sops/${a.slug}`}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 min-h-[44px]"
                >
                  <FileText className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white flex items-center gap-2 flex-wrap">
                      {a.title}
                      {a.is_draft && (
                        <span className="text-[10px] uppercase tracking-wider text-amber-300 border border-amber-400/40 rounded px-1.5 py-0.5">
                          Draft
                        </span>
                      )}
                    </p>
                    {a.tags && a.tags.length > 0 && (
                      <p className="text-[11px] text-slate-500 mt-0.5">{a.tags.join(' · ')}</p>
                    )}
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Updated {new Date(a.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
