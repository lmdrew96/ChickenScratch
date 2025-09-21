import { notFound } from 'next/navigation';

import { StatusBadge } from '@/components/common/status-badge';
import { createSignedUrl, createSignedUrls } from '@/lib/storage';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Submission } from '@/types/database';

export default async function PublishedDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('submissions')
    .select('id, title, summary, type, cover_image, content_warnings, art_files, text_body, published_url, issue, updated_at')
    .eq('id', id)
    .eq('published', true)
    .maybeSingle();

  const submission = data as PublishedDetailRow | null;

  if (!submission) {
    notFound();
  }

  const artFiles = Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [];
  const coverUrl = submission.cover_image ? await createSignedUrl(submission.cover_image) : null;
  const assetEntries = await createSignedUrls(artFiles);

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge status="published" />
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">
            {submission.type === 'writing' ? 'Writing' : 'Visual art'}
          </span>
          {submission.issue ? (
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-wide text-white/60">{submission.issue}</span>
          ) : null}
        </div>
        <h1 className="text-4xl font-semibold text-white">{submission.title}</h1>
        <p className="text-sm text-white/70">{submission.summary ?? 'No summary provided.'}</p>
        {submission.content_warnings ? (
          <p className="text-xs uppercase tracking-wide text-amber-200">Content warnings: {submission.content_warnings}</p>
        ) : null}
      </header>

      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverUrl} alt={submission.title} className="w-full rounded-xl border border-white/10 object-cover" />
      ) : null}

      {submission.type === 'writing' ? (
        <article className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/80">
          <p className="text-xs uppercase tracking-wide text-white/50">
            Published {submission.updated_at ? new Date(submission.updated_at).toLocaleDateString() : 'recently'}
          </p>
          <div className="whitespace-pre-wrap">{submission.text_body ?? 'No text available.'}</div>
          {submission.published_url ? (
            <p className="text-xs text-amber-200">
              External link:{' '}
              <a href={submission.published_url} target="_blank" rel="noopener noreferrer" className="underline">
                {submission.published_url}
              </a>
            </p>
          ) : null}
        </article>
      ) : (
        <section className="space-y-4">
          <p className="text-sm text-white/70">Download attachments to view the full-resolution work.</p>
          <ul className="space-y-2">
            {assetEntries.map(({ path, signedUrl }) => (
              <li
                key={path}
                className="flex items-center justify-between rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
              >
                <span>{path.split('/').pop()}</span>
                {signedUrl ? (
                  <a href={signedUrl} target="_blank" rel="noopener noreferrer" className="text-amber-200 hover:text-amber-100">
                    Download
                  </a>
                ) : (
                  <span className="text-xs text-white/50">Link unavailable</span>
                )}
              </li>
            ))}
            {assetEntries.length === 0 ? (
              <li className="text-xs text-white/50">No attachments available.</li>
            ) : null}
          </ul>
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

type PublishedDetailRow = Pick<
  Submission,
  | 'id'
  | 'title'
  | 'summary'
  | 'type'
  | 'cover_image'
  | 'content_warnings'
  | 'art_files'
  | 'text_body'
  | 'published_url'
  | 'issue'
  | 'updated_at'
>;
