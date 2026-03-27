import { eq, desc } from 'drizzle-orm';

import { PageHeader } from '@/components/navigation';
import { PublishedGalleryClient } from '@/components/gallery';
import { EmptyState } from '@/components/ui';
import { logHandledIssue } from '@/lib/logging';
import { createSignedUrl } from '@/lib/storage';
import { db } from '@/lib/db';
import { submissions, zineIssues } from '@/lib/db/schema';
import type { PublishedSubmission } from '@/types/database';
import { parseImageTransform } from '@/types/image-transform';

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
    image_transform: unknown;
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
        image_transform: submissions.image_transform,
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
    rawSubmissions.map(async ({ image_transform, ...submission }) => {
      const transform = parseImageTransform(image_transform);
      const processedSignedUrl = transform?.processedPath
        ? await createSignedUrl(transform.processedPath)
        : null;
      return {
        ...submission,
        art_files: Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [],
        coverSignedUrl: processedSignedUrl ?? (submission.cover_image ? await createSignedUrl(submission.cover_image) : null),
        imageTransform: transform,
        processedSignedUrl,
      };
    })
  );

  // Build a map from "volume_issueNumber" → zine issue ID for linking gallery items to their issue pages
  const issueIdMap: Record<string, string> = {};
  try {
    const issues = await db()
      .select({ id: zineIssues.id, volume: zineIssues.volume, issue_number: zineIssues.issue_number })
      .from(zineIssues)
      .where(eq(zineIssues.is_published, true));
    for (const issue of issues) {
      if (issue.volume && issue.issue_number) {
        issueIdMap[`${issue.volume}_${issue.issue_number}`] = issue.id;
      }
    }
  } catch {
    // Non-fatal: links just won't appear
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Published"
        description="Explore the latest stories and artwork from the Chicken Scratch community."
      />

      {encounteredLoadIssue && publishedSubmissions.length === 0 ? (
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
      ) : publishedSubmissions.length === 0 ? (
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
      ) : (
        <PublishedGalleryClient submissions={publishedSubmissions} issueIdMap={issueIdMap} />
      )}
    </div>
  );
}
