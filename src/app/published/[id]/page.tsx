import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq, and } from 'drizzle-orm';

import { StatusBadge } from '@/components/common/status-badge';
import { logHandledIssue } from '@/lib/logging';
import { createSignedUrl, createSignedUrls } from '@/lib/storage';
import { db } from '@/lib/db';
import { submissions, zineIssues } from '@/lib/db/schema';
import { parseImageTransform } from '@/types/image-transform';

export default async function PublishedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let submission: {
    id: string;
    title: string;
    summary: string | null;
    type: string;
    cover_image: string | null;
    content_warnings: string | null;
    art_files: unknown;
    text_body: string | null;
    published_url: string | null;
    issue: string | null;
    volume: number | null;
    issue_number: number | null;
    publish_date: Date | null;
    published_html: string | null;
    image_transform: unknown;
    updated_at: Date | null;
  } | null = null;
  let encounteredLoadIssue = false;

  try {
    const result = await db()
      .select({
        id: submissions.id,
        title: submissions.title,
        summary: submissions.summary,
        type: submissions.type,
        cover_image: submissions.cover_image,
        content_warnings: submissions.content_warnings,
        art_files: submissions.art_files,
        text_body: submissions.text_body,
        published_url: submissions.published_url,
        issue: submissions.issue,
        volume: submissions.volume,
        issue_number: submissions.issue_number,
        publish_date: submissions.publish_date,
        published_html: submissions.published_html,
        image_transform: submissions.image_transform,
        updated_at: submissions.updated_at,
      })
      .from(submissions)
      .where(and(eq(submissions.id, id), eq(submissions.published, true)))
      .limit(1);

    submission = result[0] ?? null;
  } catch (error) {
    encounteredLoadIssue = true;
    logHandledIssue('published:detail:unexpected', {
      reason: 'Unexpected failure while loading published submission',
      cause: error,
      context: { submissionId: id },
    });
  }

  if (!submission) {
    if (encounteredLoadIssue) {
      return (
        <div className="space-y-6">
          <header className="space-y-3">
            <h1 className="text-3xl font-semibold text-white">Published piece temporarily unavailable</h1>
            <p className="text-sm text-white/70">
              We couldn&apos;t load this work just now. Please refresh the page or return to the published gallery.
            </p>
          </header>
          <Link
            href="/published"
            className="inline-flex w-fit items-center justify-center rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/40 hover:text-white"
          >
            Back to published gallery
          </Link>
        </div>
      );
    }
    notFound();
  }

  const artFiles = Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [];
  const coverUrl = submission.cover_image ? await createSignedUrl(submission.cover_image) : null;

  // Look up the matching zine issue to link the issue badge
  let issuePageId: string | null = null;
  if (submission.volume && submission.issue_number) {
    try {
      const issueResult = await db()
        .select({ id: zineIssues.id })
        .from(zineIssues)
        .where(and(
          eq(zineIssues.volume, submission.volume),
          eq(zineIssues.issue_number, submission.issue_number),
          eq(zineIssues.is_published, true),
        ))
        .limit(1);
      issuePageId = issueResult[0]?.id ?? null;
    } catch {
      // Non-fatal: badge renders as plain text
    }
  }
  const assetEntries = await createSignedUrls(artFiles);
  const imageTransform = parseImageTransform(submission.image_transform);
  const processedUrl = imageTransform?.processedPath
    ? await createSignedUrl(imageTransform.processedPath)
    : null;

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status="published" />
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
            {submission.type === 'writing' ? 'Writing' : 'Visual art'}
          </span>
          {(submission.volume && submission.issue_number) ? (
            issuePageId ? (
              <Link
                href={`/issues/${issuePageId}`}
                className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60 transition hover:bg-white/20 hover:text-white/80"
              >
                Vol. {submission.volume}, No. {submission.issue_number}
              </Link>
            ) : (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
                Vol. {submission.volume}, No. {submission.issue_number}
              </span>
            )
          ) : submission.issue ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">{submission.issue}</span>
          ) : null}
        </div>
        <h1 className="text-4xl font-semibold text-white">{submission.title}</h1>
        <p className="text-sm text-white/70">{submission.summary ?? 'No summary provided.'}</p>
        {submission.content_warnings ? (
          <p className="text-xs uppercase tracking-wide text-amber-200">Content warnings: {submission.content_warnings}</p>
        ) : null}
      </header>

      {submission.type === 'writing' && (processedUrl ?? coverUrl) ? (
        <div className="flex justify-center rounded-xl border border-white/10 overflow-hidden p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={processedUrl ?? coverUrl!}
            alt={submission.title}
            className="block max-h-[80vh] w-auto"
          />
        </div>
      ) : null}

      {submission.type === 'writing' ? (
        <article className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/80">
          <p className="text-xs uppercase tracking-wide text-white/50">
            Published{' '}
            {submission.publish_date
              ? submission.publish_date.toLocaleDateString()
              : submission.updated_at
                ? submission.updated_at.toLocaleDateString()
                : 'recently'}
            {submission.volume && submission.issue_number
              ? ` \u2014 Vol. ${submission.volume}, No. ${submission.issue_number}`
              : submission.issue
                ? ` \u2014 ${submission.issue}`
                : ''}
          </p>
          {submission.published_html ? (
            <div
              className="prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: submission.published_html }}
            />
          ) : (
            <div className="whitespace-pre-wrap">{submission.text_body ?? 'No text available.'}</div>
          )}
        </article>
      ) : (
        <section className="space-y-6">
          {assetEntries.map(({ path, signedUrl }, index) => {
            const displayUrl = index === 0 && processedUrl ? processedUrl : signedUrl;
            return (
            <div key={path} className="space-y-2">
              {displayUrl ? (
                <div className="flex justify-center rounded-xl border border-white/10 overflow-hidden p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayUrl}
                    alt={path.split('/').pop() ?? submission.title}
                    className="block max-h-[80vh] w-auto"
                  />
                </div>
              ) : null}
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>{path.split('/').pop()}</span>
                {signedUrl ? (
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-amber-200 hover:text-amber-100">
                    Download full resolution
                  </a>
                ) : (
                  <span className="text-xs text-white/50">Link unavailable</span>
                )}
              </div>
            </div>
            );
          })}
          {assetEntries.length === 0 ? (
            <p className="text-sm text-white/50">No artwork available.</p>
          ) : null}
          {submission.published_url ? (
            <a
              href={submission.published_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-md border border-amber-400/60 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:border-amber-300 hover:bg-amber-400/10"
            >
              View external gallery
            </a>
          ) : null}
        </section>
      )}
    </div>
  );
}
