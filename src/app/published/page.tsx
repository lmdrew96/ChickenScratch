import Link from 'next/link';

import { StatusBadge } from '@/components/common/status-badge';
import { createSignedUrl } from '@/lib/storage';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';
import type { Submission } from '@/types/database';

export default async function PublishedPage() {
  const supabase = await createSupabaseServerReadOnlyClient();
  const { data } = await supabase
    .from('submissions')
    .select('id, title, summary, type, cover_image, published_url, issue, art_files, updated_at, created_at')
    .eq('published', true)
    .order('updated_at', { ascending: false });

  const rawSubmissions = (data ?? []) as unknown as PublishedSubmissionRow[];
  const submissions: PublishedSubmission[] = await Promise.all(
    rawSubmissions.map(async (submission) => ({
      ...submission,
      art_files: Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [],
      coverSignedUrl: submission.cover_image ? await createSignedUrl(submission.cover_image) : null,
    }))
  );

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Published pieces</h1>
        <p className="text-sm text-white/70">
          Explore the latest stories and artwork from the Chicken Scratch community. Visual work includes signed download
          links valid for seven days.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        {submissions.map((submission) => (
          <article
            key={submission.id}
            className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-lg shadow-black/30"
          >
            {submission.coverSignedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={submission.coverSignedUrl}
                alt={submission.title}
                className="h-48 w-full object-cover transition group-hover:opacity-90"
              />
            ) : (
              <div className="flex h-48 items-center justify-center bg-gradient-to-br from-amber-500/40 to-purple-500/30">
                <span className="text-sm font-semibold uppercase tracking-wide text-white/70">Chicken Scratch</span>
              </div>
            )}
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-center gap-2 text-xs text-white/60">
                <StatusBadge status="published" />
                {submission.issue ? <span className="rounded-full bg-white/10 px-2 py-1">{submission.issue}</span> : null}
                <span>{submission.type === 'writing' ? 'Writing' : 'Visual art'}</span>
              </div>
              <h2 className="text-xl font-semibold text-white">{submission.title}</h2>
              <p className="text-sm text-white/70">{submission.summary ?? 'No summary provided.'}</p>
              <div className="mt-auto flex items-center justify-between text-sm text-white/60">
                <Link
                  href={`/published/${submission.id}`}
                  className="text-amber-200 transition hover:text-amber-100"
                >
                  View details
                </Link>
                {submission.published_url ? (
                  <a
                    href={submission.published_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-200 transition hover:text-amber-100"
                  >
                    External link
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {submissions.length === 0 ? (
          <p className="col-span-full rounded-xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-sm text-white/60">
            No published work yet. Check back soon!
          </p>
        ) : null}
      </section>
    </div>
  );
}

type PublishedSubmissionRow = Pick<
  Submission,
  | 'id'
  | 'title'
  | 'summary'
  | 'type'
  | 'cover_image'
  | 'published_url'
  | 'issue'
  | 'art_files'
  | 'updated_at'
  | 'created_at'
>;

type PublishedSubmission = Omit<PublishedSubmissionRow, 'art_files'> & {
  art_files: string[];
  coverSignedUrl: string | null;
};
