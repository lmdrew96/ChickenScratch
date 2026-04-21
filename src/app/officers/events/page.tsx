import Link from 'next/link';
import { desc, eq, count } from 'drizzle-orm';
import { CalendarClock, ExternalLink, MapPin, Mic, Users } from 'lucide-react';

import PageHeader from '@/components/shell/page-header';
import { requireOfficerRole } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { events, eventSignups, eventPerformanceSignups } from '@/lib/db/schema';

function formatEventDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/New_York',
  });
}

export default async function OfficerEventsPage() {
  await requireOfficerRole('/officers/events');
  const database = db();

  // Count separately to avoid join multiplication when an event has both kinds of signups.
  const [eventRows, potluckCounts, performanceCounts] = await Promise.all([
    database
      .select({
        id: events.id,
        slug: events.slug,
        name: events.name,
        event_date: events.event_date,
        location: events.location,
        signups_open: events.signups_open,
      })
      .from(events)
      .orderBy(desc(events.event_date)),
    database
      .select({ event_id: eventSignups.event_id, count: count() })
      .from(eventSignups)
      .groupBy(eventSignups.event_id),
    database
      .select({ event_id: eventPerformanceSignups.event_id, count: count() })
      .from(eventPerformanceSignups)
      .groupBy(eventPerformanceSignups.event_id),
  ]);

  const potluckCountByEvent = new Map(potluckCounts.map((r) => [r.event_id, Number(r.count)]));
  const performanceCountByEvent = new Map(
    performanceCounts.map((r) => [r.event_id, Number(r.count)]),
  );

  const rows = eventRows.map((r) => ({
    ...r,
    signup_count: potluckCountByEvent.get(r.id) ?? 0,
    performance_count: performanceCountByEvent.get(r.id) ?? 0,
  }));

  const now = Date.now();

  return (
    <>
      <PageHeader
        title="Events"
        description="Reusable signup system. Manage per-event signups, toggle open/closed, and export CSVs."
        breadcrumbItems={[
          { label: 'Officers', href: '/officers' },
          { label: 'Events', href: '/officers/events' },
        ]}
      />

      {rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
          No events yet. Seed one via SQL or ask dev to add an admin creator.
        </div>
      ) : (
        <ul className="mt-6 grid gap-3">
          {rows.map((r) => {
            const isPast = r.event_date.getTime() <= now;
            const openEffective = r.signups_open && !isPast;
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-guavine text-xl font-bold text-white">{r.name}</h2>
                      <StatusBadge open={openEffective} past={isPast} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">/{r.slug}</p>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-300">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarClock className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
                        {formatEventDateTime(r.event_date)}
                      </span>
                      {r.location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
                          {r.location}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
                        {r.signup_count} potluck
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Mic className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden="true" />
                        {r.performance_count} performance{r.performance_count === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/officers/events/${r.slug}/signups`}
                      className="inline-flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[#003b72] hover:bg-amber-300 min-h-[32px]"
                    >
                      Manage signups
                    </Link>
                    <Link
                      href={`/events/${r.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border border-white/20 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 min-h-[32px]"
                    >
                      Public page
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function StatusBadge({ open, past }: { open: boolean; past: boolean }) {
  if (past) {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-500/40 bg-slate-500/10 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
        Past
      </span>
    );
  }
  if (open) {
    return (
      <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
        Open
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
      Paused
    </span>
  );
}
