import { PublishedGalleryClient } from '@/components/gallery';
import { EmptyState } from '@/components/ui';
import { logHandledIssue } from '@/lib/logging';
import { createSignedUrl } from '@/lib/storage';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';
import type { PublishedSubmissionRow, PublishedSubmission } from '@/types/database';

export default async function PublishedPage() {
  const supabase = await createSupabaseServerReadOnlyClient();
  let rawSubmissions: PublishedSubmissionRow[] = [];
  let encounteredLoadIssue = false;

  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('id, title, summary, type, cover_image, published_url, issue, art_files, updated_at, created_at')
      .eq('published', true)
      .order('updated_at', { ascending: false });

    if (error) {
      encounteredLoadIssue = true;
      logHandledIssue('published:index:query', {
        reason: 'Supabase query for published submissions failed',
        context: {
          supabaseMessage: error.message,
          supabaseDetails: error.details,
          supabaseHint: error.hint,
          supabaseCode: error.code,
        },
      });
    } else {
      rawSubmissions = (data ?? []) as unknown as PublishedSubmissionRow[];
    }
  } catch (error) {
    encounteredLoadIssue = true;
    logHandledIssue('published:index:unexpected', {
      reason: 'Unexpected failure while loading published submissions',
      cause: error,
    });
  }

  const submissions: PublishedSubmission[] = await Promise.all(
    rawSubmissions.map(async (submission) => ({
      ...submission,
      art_files: Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [],
      coverSignedUrl: submission.cover_image ? await createSignedUrl(submission.cover_image) : null,
    }))
  );

  // Show error state if there was a loading issue
  if (encounteredLoadIssue && submissions.length === 0) {
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
  if (submissions.length === 0) {
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

  return <PublishedGalleryClient submissions={submissions} />;
}
