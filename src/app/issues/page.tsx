import Link from 'next/link';
import { eq, desc } from 'drizzle-orm';

import PageHeader from '@/components/shell/page-header';
import { PdfCover } from '@/components/issues/pdf-cover';
import { db } from '@/lib/db';
import { zineIssues } from '@/lib/db/schema';
import type { ZineIssue } from '@/types/database';

export const dynamic = 'force-dynamic';

function formatMeta(issue: ZineIssue): string {
  return [
    issue.volume != null && `Vol. ${issue.volume}`,
    issue.issue_number != null && `Issue ${issue.issue_number}`,
    issue.publish_date &&
      new Date(issue.publish_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        timeZone: 'America/New_York',
      }),
  ]
    .filter(Boolean)
    .join(' · ');
}

export default async function IssuesPage() {
  let issues: ZineIssue[] = [];

  try {
    issues = await db()
      .select()
      .from(zineIssues)
      .where(eq(zineIssues.is_published, true))
      .orderBy(desc(zineIssues.publish_date));
  } catch (error) {
    console.error('Failed to load zine issues:', error);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issues"
        description="Browse all published issues of Hen &amp; Ink."
      />

      {issues.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-lg">
          <p className="text-slate-400">No issues published yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {issues.map(issue => {
            const meta = formatMeta(issue);
            return (
              <Link
                key={issue.id}
                href={`/issues/${issue.id}`}
                className="group block"
              >
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 p-3 shadow transition hover:border-white/20 hover:bg-white/10">
                  {issue.pdf_url ? (
                    <PdfCover pdfUrl={issue.pdf_url} title={issue.title} />
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-white/5 text-xs text-slate-500">
                      No preview
                    </div>
                  )}
                  <div className="mt-2 space-y-0.5">
                    <p className="truncate text-sm font-semibold text-[var(--text)] group-hover:text-[var(--accent)]">
                      {issue.title}
                    </p>
                    {meta && (
                      <p className="truncate text-xs text-slate-400">{meta}</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
