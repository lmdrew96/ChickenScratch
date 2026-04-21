import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Download, ExternalLink } from 'lucide-react';

import PageHeader from '@/components/shell/page-header';
import { requireOfficerRole } from '@/lib/auth/guards';
import {
  getEventBySlug,
  getSignupsByEventId,
  getPerformanceSignupsByEventId,
  totalPerformanceMinutes,
} from '@/lib/data/event-queries';
import { SIGNUP_CATEGORY_LABEL } from '@/lib/validations/event-signup';
import { SignupsToggle } from './signups-toggle';
import { SignupsTable } from './signups-table';
import { PerformancesTable } from './performances-table';

type PageProps = { params: Promise<{ slug: string }> };

function formatEventDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: 'America/New_York',
  });
}

export default async function EventSignupsAdminPage({ params }: PageProps) {
  const { slug } = await params;
  await requireOfficerRole(`/officers/events/${slug}/signups`);

  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [signups, performances] = await Promise.all([
    getSignupsByEventId(event.id),
    getPerformanceSignupsByEventId(event.id),
  ]);
  const totalMinutes = totalPerformanceMinutes(performances);
  const isPast = event.event_date.getTime() <= Date.now();

  return (
    <>
      <PageHeader
        title={event.name}
        description={`Signup management — ${formatEventDateTime(event.event_date)}${event.location ? ` · ${event.location}` : ''}`}
        breadcrumbItems={[
          { label: 'Officers', href: '/officers' },
          { label: 'Events', href: '/officers/events' },
          { label: event.name, href: `/officers/events/${event.slug}/signups` },
        ]}
      />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <SignupsToggle eventId={event.id} open={event.signups_open} disabled={isPast} />
        <Link
          href={`/events/${event.slug}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 min-h-[32px]"
        >
          Public page
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </Link>
        <span className="ml-auto text-xs text-slate-400">
          {signups.length} potluck · {performances.length} performance{performances.length === 1 ? '' : 's'}
          {isPast && ' · event has passed'}
        </span>
      </div>

      {/* === Potluck === */}
      <section aria-labelledby="potluck-admin-heading" className="mt-10">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="potluck-admin-heading" className="font-guavine text-2xl font-bold text-white">
            Potluck
          </h2>
          <span className="text-xs text-slate-400">
            {signups.length} signup{signups.length === 1 ? '' : 's'}
          </span>
          <a
            href={`/officers/events/${event.slug}/signups/export`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 min-h-[32px]"
          >
            <Download className="h-3 w-3" aria-hidden="true" />
            Export CSV
          </a>
        </div>

        <div className="mt-4">
          {signups.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              No potluck signups yet.
            </div>
          ) : (
            <SignupsTable signups={signups} categoryLabels={SIGNUP_CATEGORY_LABEL} />
          )}
        </div>
      </section>

      {/* === Performances === */}
      <section aria-labelledby="performances-admin-heading" className="mt-12">
        <div className="flex flex-wrap items-center gap-3">
          <h2 id="performances-admin-heading" className="font-guavine text-2xl font-bold text-white">
            Live performances
          </h2>
          <span className="text-xs text-slate-400">
            {performances.length} signup{performances.length === 1 ? '' : 's'} · {totalMinutes} min total
          </span>
          <a
            href={`/officers/events/${event.slug}/signups/performances-export`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 min-h-[32px]"
          >
            <Download className="h-3 w-3" aria-hidden="true" />
            Export CSV
          </a>
        </div>

        <div className="mt-4">
          {performances.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
              No performance signups yet.
            </div>
          ) : (
            <PerformancesTable performances={performances} />
          )}
        </div>
      </section>
    </>
  );
}
