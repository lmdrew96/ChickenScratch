import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { CalendarClock, MapPin } from 'lucide-react';

import { PageHeader } from '@/components/navigation';
import {
  getEventBySlug,
  getSignupsByEventId,
  groupSignupsByCategory,
  isSignupsEffectivelyOpen,
  type SignupRow,
} from '@/lib/data/event-queries';
import { SIGNUP_CATEGORIES, SIGNUP_CATEGORY_LABEL } from '@/lib/validations/event-signup';
import { SignupForm } from './signup-form';

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

  const signups = await getSignupsByEventId(event.id);
  const grouped = groupSignupsByCategory(signups);
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

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Signup Form */}
        <section aria-labelledby="signup-form-heading" className="lg:sticky lg:top-6 lg:self-start">
          <h2 id="signup-form-heading" className="font-guavine text-2xl font-bold">
            {openForSignups ? 'Sign up' : isPast ? 'This event has passed' : 'Signups are closed'}
          </h2>
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

        {/* Signup List */}
        <section aria-labelledby="signup-list-heading">
          <h2 id="signup-list-heading" className="font-guavine text-2xl font-bold">
            What&apos;s on the table
          </h2>
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
