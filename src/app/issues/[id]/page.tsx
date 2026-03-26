import { notFound } from 'next/navigation';
import { eq, and } from 'drizzle-orm';

import PageHeader from '@/components/shell/page-header';
import { PdfFlipbook } from '@/components/issues/pdf-flipbook';
import { db } from '@/lib/db';
import { zineIssues } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

function formatMeta(volume: number | null, issueNumber: number | null, publishDate: Date | null): string {
  return [
    volume != null && `Volume ${volume}`,
    issueNumber != null && `Issue ${issueNumber}`,
    publishDate &&
      new Date(publishDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        timeZone: 'America/New_York',
      }),
  ]
    .filter(Boolean)
    .join(' · ');
}

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  let issue;
  try {
    const rows = await db()
      .select()
      .from(zineIssues)
      .where(and(eq(zineIssues.id, id), eq(zineIssues.is_published, true)))
      .limit(1);
    issue = rows[0];
  } catch (error) {
    console.error('Failed to load issue:', error);
  }

  if (!issue) notFound();

  const meta = formatMeta(issue.volume, issue.issue_number, issue.publish_date);

  return (
    <div className="space-y-6">
      <PageHeader
        title={issue.title}
        description={meta || undefined}
        showBackButton
        backButtonHref="/issues"
        backButtonLabel="All Issues"
      />

      {issue.pdf_url ? (
        <PdfFlipbook pdfUrl={issue.pdf_url} title={issue.title} />
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-lg">
          <p className="text-slate-400">No PDF available for this issue.</p>
        </div>
      )}
    </div>
  );
}
