import { cookies, headers } from 'next/headers';

import PageHeader from '@/components/shell/page-header';
import { requireUser } from '@/lib/auth/guards';

type SubmissionListItem = {
  id?: string | null;
  title?: string | null;
  status?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
};

export default async function MinePage() {
  await requireUser('/mine');

  const submissions = await loadMineSubmissions();

  return (
    <div className="space-y-6">
      <PageHeader title="My Submissions" ctaHref="/submit" ctaLabel="Submit new" />
      {submissions.length === 0 ? (
        <div className="rounded-xl border border-white/15 bg-white/5 p-6 text-slate-300">No submissions yet.</div>
      ) : (
        <ul className="space-y-4">
          {submissions.map((submission, index) => {
            const key = submission.id ?? `submission-${index}`;
            const title = (submission.title ?? '').trim() || 'Untitled submission';
            const status = formatStatus(submission.status);
            const updated = formatDate(
              submission.updated_at ?? submission.updatedAt ?? submission.created_at ?? submission.createdAt
            );

            return (
              <li key={key}>
                <article className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className="text-lg font-semibold text-[var(--text)]">{title}</h2>
                      <p className="text-sm text-slate-400">Updated {updated}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100">
                      {status}
                    </span>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

async function loadMineSubmissions(): Promise<SubmissionListItem[]> {
  try {
    const headerList = await headers();
    const protocol = headerList.get('x-forwarded-proto') ?? 'http';
    const host = headerList.get('x-forwarded-host') ?? headerList.get('host');

    if (!host) {
      return [];
    }

    const baseUrl = `${protocol}://${host}`;
    const cookieStore = cookies();
    const cookieHeader = cookieStore.toString();

    const response = await fetch(`${baseUrl}/api/submissions?mine=1`, {
      method: 'GET',
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json().catch(() => null);

    if (!payload) {
      return [];
    }

    if (Array.isArray(payload)) {
      return payload as SubmissionListItem[];
    }

    if (Array.isArray(payload.data)) {
      return payload.data as SubmissionListItem[];
    }

    if (Array.isArray(payload.submissions)) {
      return payload.submissions as SubmissionListItem[];
    }

    return [];
  } catch {
    return [];
  }
}

function formatStatus(status?: string | null) {
  if (!status) {
    return 'Submitted';
  }

  return status
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function formatDate(value?: string | null) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
