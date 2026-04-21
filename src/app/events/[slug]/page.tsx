import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CalendarClock, MapPin } from 'lucide-react';

import { PageHeader } from '@/components/navigation';
import {
  getEventBySlug,
  getSignupsByEventId,
  getPerformanceSignupsByEventId,
  groupSignupsByCategory,
  groupPerformancesByKind,
  isSignupsEffectivelyOpen,
  totalPerformanceMinutes,
  type SignupRow,
  type PerformanceRow,
} from '@/lib/data/event-queries';
import { SIGNUP_CATEGORIES, SIGNUP_CATEGORY_LABEL } from '@/lib/validations/event-signup';
import {
  PERFORMANCE_KINDS,
  PERFORMANCE_KIND_LABEL,
} from '@/lib/validations/event-performance-signup';
import { SignupForm } from './signup-form';
import { PerformanceSignupForm } from './performance-signup-form';

type PageProps = { params: Promise<{ slug: string }> };

const CATEGORY_DOT_CLASS: Record<(typeof SIGNUP_CATEGORIES)[number], string> = {
  sweet: 'bg-pink-400',
  savory: 'bg-orange-400',
  drink: 'bg-sky-400',
  utensils: 'bg-slate-400',
  other: 'bg-purple-400',
};

const CATEGORY_EMPTY_COPY: Record<(typeof SIGNUP_CATEGORIES)[number], string> = {
  sweet: 'No sweets yet. Someone grab the cookies!',
  savory: 'No savory yet. First warm dish wins.',
  drink: 'No drinks yet. BYOB — bring your own beverages.',
  utensils: 'No utensils yet. Plates, forks, napkins — we need them.',
  other: 'Nothing else yet. Bringing something unusual? Toss it here.',
};

const PERFORMANCE_DOT_CLASS: Record<(typeof PERFORMANCE_KINDS)[number], string> = {
  poetry: 'bg-violet-400',
  storytelling: 'bg-emerald-400',
  one_act_play: 'bg-rose-400',
};

const PERFORMANCE_EMPTY_COPY: Record<(typeof PERFORMANCE_KINDS)[number], string> = {
  poetry: 'No poems on the bill yet. Open mic — be the first.',
  storytelling: 'No stories yet. Got one to share?',
  one_act_play: 'No plays yet. Bring your scene.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: 'Event not found — Chicken Scratch' };
  return {
    title: `${event.name} — Chicken Scratch`,
    description: event.description ?? `Sign up for ${event.name} with the Hen & Ink Society.`,
  };
}

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

export default async function EventSignupPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const [signups, performances] = await Promise.all([
    getSignupsByEventId(event.id),
    getPerformanceSignupsByEventId(event.id),
  ]);
  const grouped = groupSignupsByCategory(signups);
  const performancesByKind = groupPerformancesByKind(performances);
  const totalMinutes = totalPerformanceMinutes(performances);
  const openForSignups = isSignupsEffectivelyOpen(event);
  const isPast = event.event_date.getTime() <= Date.now();

  return (
    <>
      {/* Event Header */}
      <PageHeader
        title={event.name}
        description={event.description ?? undefined}
        breadcrumbItems={[{ label: event.name, href: `/events/${event.slug}` }]}
      />

      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
        <span className="inline-flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
          {formatEventDateTime(event.event_date)}
        </span>
        {event.location && (
          <span className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[var(--accent)]" aria-hidden="true" />
            {event.location}
          </span>
        )}
      </div>

      <div className="mt-4 h-[2px] w-24 rounded-full bg-[var(--accent)]" aria-hidden="true" />

      {/* Quick nav between the two signups */}
      <nav aria-label="Sign up sections" className="mt-6 flex flex-wrap gap-2 text-sm">
        <a
          href="#potluck"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-white hover:border-white/30 hover:bg-white/10"
        >
          🥘 Potluck
        </a>
        <a
          href="#performances"
          className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 font-semibold text-white hover:border-white/30 hover:bg-white/10"
        >
          🎤 Live performances
        </a>
      </nav>

      {/* === POTLUCK === */}
      <h2 id="potluck" className="mt-10 font-guavine text-3xl font-bold text-white">
        The potluck
      </h2>
      <p className="mt-1 text-sm text-slate-300">
        Bring a dish, a drink, or utensils to share.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Potluck Signup Form */}
        <section aria-labelledby="signup-form-heading" className="lg:sticky lg:top-6 lg:self-start">
          <h3 id="signup-form-heading" className="font-guavine text-2xl font-bold">
            {openForSignups ? 'Sign up' : isPast ? 'This event has passed' : 'Signups are closed'}
          </h3>
          {openForSignups ? (
            <p className="mt-1 text-sm text-slate-300">
              Tell us what you&apos;re bringing. You&apos;ll get a confirmation email at your @udel.edu address.
            </p>
          ) : isPast ? (
            <p className="mt-1 text-sm text-slate-300">
              Signups closed automatically when the event started. Scroll down to see who brought what.
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-300">
              An officer has paused signups for this event. Check back soon.
            </p>
          )}
          {openForSignups && (
            <div className="mt-4">
              <SignupForm slug={event.slug} />
            </div>
          )}
        </section>

        {/* Potluck List */}
        <section aria-labelledby="signup-list-heading">
          <h3 id="signup-list-heading" className="font-guavine text-2xl font-bold">
            What&apos;s on the table
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            {signups.length === 0
              ? 'Be the first to sign up!'
              : `${signups.length} ${signups.length === 1 ? 'person is' : 'people are'} bringing something so far.`}
          </p>

          <div className="mt-4 space-y-5">
            {SIGNUP_CATEGORIES.map((category) => (
              <CategorySection
                key={category}
                category={category}
                signups={grouped[category]}
              />
            ))}
          </div>
        </section>
      </div>

      {/* === LIVE PERFORMANCES === */}
      <h2 id="performances" className="mt-16 font-guavine text-3xl font-bold text-white">
        The bill: live performances
      </h2>
      <p className="mt-1 text-sm text-slate-300">
        Open mic for poetry, storytelling, and one-act plays. Up to 15 minutes per slot &mdash;
        sign up more than once if you&apos;ve got more to share.
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Performance Signup Form */}
        <section
          aria-labelledby="performance-form-heading"
          className="lg:sticky lg:top-6 lg:self-start"
        >
          <h3 id="performance-form-heading" className="font-guavine text-2xl font-bold">
            {openForSignups
              ? 'Get on the bill'
              : isPast
                ? 'This event has passed'
                : 'Signups are closed'}
          </h3>
          {openForSignups ? (
            <p className="mt-1 text-sm text-slate-300">
              Tell us what you&apos;re bringing to the mic. You&apos;ll get a confirmation email
              at your @udel.edu address.
            </p>
          ) : isPast ? (
            <p className="mt-1 text-sm text-slate-300">
              Signups closed automatically when the event started. Scroll down to see the bill.
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-300">
              An officer has paused signups for this event. Check back soon.
            </p>
          )}
          {openForSignups && (
            <div className="mt-4">
              <PerformanceSignupForm slug={event.slug} />
            </div>
          )}
        </section>

        {/* Performance List */}
        <section aria-labelledby="performance-list-heading">
          <h3 id="performance-list-heading" className="font-guavine text-2xl font-bold">
            On the bill
          </h3>
          <p className="mt-1 text-sm text-slate-300">
            {performances.length === 0
              ? 'No performers yet. Be the first to take the mic.'
              : `${performances.length} ${performances.length === 1 ? 'piece' : 'pieces'} so far · about ${totalMinutes} ${totalMinutes === 1 ? 'minute' : 'minutes'} of runtime.`}
          </p>

          <div className="mt-4 space-y-5">
            {PERFORMANCE_KINDS.map((kind) => (
              <PerformanceKindSection
                key={kind}
                kind={kind}
                performances={performancesByKind[kind]}
              />
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function CategorySection({
  category,
  signups,
}: {
  category: (typeof SIGNUP_CATEGORIES)[number];
  signups: SignupRow[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      {/* Category Section Header */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${CATEGORY_DOT_CLASS[category]}`}
          aria-hidden="true"
        />
        <h3 className="font-guavine text-lg font-bold">{SIGNUP_CATEGORY_LABEL[category]}</h3>
        <span className="text-xs text-slate-400">
          {signups.length} {signups.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      {signups.length === 0 ? (
        <p className="mt-3 text-sm italic text-slate-400">{CATEGORY_EMPTY_COPY[category]}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {signups.map((s) => (
            <li
              key={s.id}
              className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-white">{s.name}</span>
                <span className="text-slate-400">is bringing</span>
                <span className="font-semibold text-[var(--accent)]">{s.item}</span>
              </div>
              {s.notes && <p className="mt-1 text-xs text-slate-300">{s.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PerformanceKindSection({
  kind,
  performances,
}: {
  kind: (typeof PERFORMANCE_KINDS)[number];
  performances: PerformanceRow[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5">
      {/* Performance Kind Header */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${PERFORMANCE_DOT_CLASS[kind]}`}
          aria-hidden="true"
        />
        <h4 className="font-guavine text-lg font-bold">{PERFORMANCE_KIND_LABEL[kind]}</h4>
        <span className="text-xs text-slate-400">
          {performances.length} {performances.length === 1 ? 'piece' : 'pieces'}
        </span>
      </div>
      {performances.length === 0 ? (
        <p className="mt-3 text-sm italic text-slate-400">{PERFORMANCE_EMPTY_COPY[kind]}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {performances.map((p) => (
            <li
              key={p.id}
              className="rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-semibold text-white">{p.name}</span>
                <span className="text-slate-400">&mdash;</span>
                <span className="font-semibold text-[var(--accent)]">
                  &ldquo;{p.piece_title}&rdquo;
                </span>
                <span className="text-xs text-slate-400">
                  {p.estimated_minutes} min
                </span>
              </div>
              {p.content_warnings && (
                <p className="mt-1 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">CW:</span> {p.content_warnings}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
