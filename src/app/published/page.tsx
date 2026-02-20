import { eq, desc } from 'drizzle-orm';

import { PublishedGalleryClient } from '@/components/gallery';
import { EmptyState } from '@/components/ui';
import { logHandledIssue } from '@/lib/logging';
import { createSignedUrl } from '@/lib/storage';
import { db } from '@/lib/db';
import { submissions } from '@/lib/db/schema';
import type { PublishedSubmission } from '@/types/database';

export default async function PublishedPage() {
  let rawSubmissions: {
    id: string;
    title: string;
    summary: string | null;
    type: string;
    cover_image: string | null;
    published_url: string | null;
    issue: string | null;
    volume: number | null;
    issue_number: number | null;
    publish_date: Date | null;
    art_files: unknown;
    updated_at: Date | null;
    created_at: Date | null;
  }[] = [];
  let encounteredLoadIssue = false;

  try {
    rawSubmissions = await db()
      .select({
        id: submissions.id,
        title: submissions.title,
        summary: submissions.summary,
        type: submissions.type,
        cover_image: submissions.cover_image,
        published_url: submissions.published_url,
        issue: submissions.issue,
        volume: submissions.volume,
        issue_number: submissions.issue_number,
        publish_date: submissions.publish_date,
        art_files: submissions.art_files,
        updated_at: submissions.updated_at,
        created_at: submissions.created_at,
      })
      .from(submissions)
      .where(eq(submissions.published, true))
      .orderBy(desc(submissions.updated_at));
  } catch (error) {
    encounteredLoadIssue = true;
    logHandledIssue('published:index:unexpected', {
      reason: 'Unexpected failure while loading published submissions',
      cause: error,
    });
  }

  const publishedSubmissions: PublishedSubmission[] = await Promise.all(
    rawSubmissions.map(async (submission) => ({
      ...submission,
      art_files: Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [],
      coverSignedUrl: submission.cover_image ? await createSignedUrl(submission.cover_image) : null,
    }))
  );

  // Show error state if there was a loading issue
  if (encounteredLoadIssue && publishedSubmissions.length === 0) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Published pieces</h1>
          <p className="text-sm text-white/70">
            Explore the latest stories and artwork from the Chicken Scratch community.
          </p>
        </header>
        <EmptyState
          variant="error"
          title="Unable to load gallery"
          description="We couldn't reach the published gallery right now. This might be a temporary issue. Please try refreshing the page or check back in a few moments."
          action={{
            label: "Refresh page",
            onClick: () => window.location.reload()
          }}
          secondaryAction={{
            label: "Go to home",
            href: "/"
          }}
        />
      </div>
    );
  }

  // Show empty state if no published works exist
  if (publishedSubmissions.length === 0) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold text-white">Published pieces</h1>
          <p className="text-sm text-white/70">
            Explore the latest stories and artwork from the Chicken Scratch community.
          </p>
        </header>
        <EmptyState
          variant="published"
          title="No published works yet"
          description="The Chicken Scratch community hasn't published any works yet. Check back soon to discover amazing stories and artwork, or be the first to submit your own work!"
          action={{
            label: "Submit your work",
            href: "/submit"
          }}
          secondaryAction={{
            label: "Learn more about us",
            href: "/about"
          }}
        />
      </div>
    );
  }

  return <PublishedGalleryClient submissions={publishedSubmissions} />;
}
