import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageHeader } from '@/components/navigation';
import { requireUser } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { exhibitionConfig } from '@/lib/db/schema';
import ExhibitionSubmissionForm from '@/components/exhibition/exhibition-form';

async function checkSubmissionsOpen(): Promise<{ open: boolean; reason?: string }> {
  try {
    const rows = await db().select().from(exhibitionConfig);
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    if (config.submissions_open === 'false') {
      return { open: false, reason: 'Submissions are currently closed.' };
    }
    if (config.submission_deadline) {
      const deadline = new Date(config.submission_deadline);
      if (!isNaN(deadline.getTime()) && new Date() > deadline) {
        return { open: false, reason: 'The submission deadline has passed.' };
      }
    }
    return { open: true };
  } catch {
    return { open: true };
  }
}

export default async function ExhibitionSubmitPage() {
  await requireUser('/exhibition/submit');

  const { open, reason } = await checkSubmissionsOpen();

  if (!open) {
    redirect(`/exhibition?closed=${encodeURIComponent(reason ?? 'Submissions are closed.')}`);
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Submit to the Exhibition"
        description="Share your work for the Hen & Ink Society's End-of-Year Flock Party (May 1, 2026 · 5–8pm)"
      />
      <div className="mx-auto max-w-2xl">
        <ExhibitionSubmissionForm />
      </div>
      <div className="mx-auto max-w-2xl">
        <Link href="/exhibition" className="text-sm text-slate-500 hover:text-slate-300">
          ← Back to exhibition info
        </Link>
      </div>
    </div>
  );
}
