import Link from 'next/link';
import { db } from '@/lib/db';
import { exhibitionConfig } from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

async function getExhibitionConfig(): Promise<Record<string, string>> {
  try {
    const rows = await db().select().from(exhibitionConfig);
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return config;
  } catch {
    return {};
  }
}

export default async function ExhibitionPage() {
  const config = await getExhibitionConfig();

  const submissionsOpen = config.submissions_open !== 'false';
  const deadlineStr = config.submission_deadline ?? null;
  const exhibitionDate = config.exhibition_date ?? '2026-05-01';

  let isPastDeadline = false;
  let formattedDeadline = '';
  if (deadlineStr) {
    const deadlineDate = new Date(deadlineStr);
    isPastDeadline = !isNaN(deadlineDate.getTime()) && new Date() > deadlineDate;
    if (!isNaN(deadlineDate.getTime())) {
      formattedDeadline = deadlineDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/New_York',
      });
    }
  }

  const exhibitionDateFormatted = new Date(exhibitionDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  });

  const accepting = submissionsOpen && !isPastDeadline;

  return (
    <div className="mx-auto max-w-2xl space-y-10 py-8">
      {/* Hero */}
      <div className="space-y-4">
        <div
          className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest"
          style={{ background: 'var(--accent)', color: '#003b72' }}
        >
          {accepting ? 'Now Accepting Submissions' : 'Submissions Closed'}
        </div>
        <h1 className="text-4xl font-bold leading-tight text-white">
          Hen &amp; Ink End&#8209;of&#8209;Year Exhibition
        </h1>
        <p className="text-lg text-slate-300">
          <strong style={{ color: 'var(--accent)' }}>{exhibitionDateFormatted}</strong>
        </p>
        <p className="text-base leading-relaxed text-slate-400">
          Join us for the Hen &amp; Ink Society&rsquo;s annual end&#8209;of&#8209;year showcase —
          a celebration of student creativity across writing and visual art. Selected work will be
          displayed at the exhibition for the entire AAP community to enjoy.
        </p>
      </div>

      {/* What we accept */}
      <section className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-semibold text-white">What we&rsquo;re looking for</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-semibold" style={{ color: 'var(--accent)' }}>
              ✍️ Writing
            </h3>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>Poetry</li>
              <li>Prose &amp; Fiction</li>
              <li>Creative Nonfiction</li>
              <li>Other written forms</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold" style={{ color: 'var(--accent)' }}>
              🎨 Visual Art
            </h3>
            <ul className="space-y-1 text-sm text-slate-400">
              <li>Painting &amp; Drawing</li>
              <li>Photography</li>
              <li>Digital Art</li>
              <li>Mixed Media</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Deadline + CTA */}
      <section className="space-y-4">
        {formattedDeadline && (
          <p className="text-sm text-slate-400">
            <span className="font-semibold text-white">Submission deadline:</span>{' '}
            {formattedDeadline}
          </p>
        )}

        {accepting ? (
          <div className="flex flex-wrap gap-4">
            <Link
              href="/exhibition/submit"
              className="btn btn-accent"
            >
              Submit your work
            </Link>
            <Link href="/exhibition/mine" className="btn">
              My submissions
            </Link>
          </div>
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-slate-400">
              {!submissionsOpen
                ? 'Submissions are currently closed. Check back later or contact us for more information.'
                : 'The submission deadline has passed. Thank you to everyone who submitted!'}
            </p>
          </div>
        )}
      </section>

      {/* Info */}
      <section className="space-y-3 text-sm text-slate-400">
        <h2 className="text-base font-semibold text-white">Who can submit?</h2>
        <p>
          The exhibition is open to all AAP students. You&rsquo;ll need a Chicken Scratch account
          to submit — it only takes a moment to sign up.
        </p>
        <h2 className="mt-4 text-base font-semibold text-white">What happens next?</h2>
        <p>
          After submitting, our officers will review your work and reach out by email with their
          decision. Accepted pieces will be displayed at the exhibition on{' '}
          {exhibitionDateFormatted}.
        </p>
      </section>
    </div>
  );
}
