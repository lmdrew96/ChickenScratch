import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { events, eventSignups, eventPerformanceSignups } from '@/lib/db/schema';
import { PERFORMANCE_KINDS, type PerformanceKind } from '@/lib/validations/event-performance-signup';

export type SignupCategory = 'sweet' | 'savory' | 'drink' | 'utensils' | 'other';

export type EventRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  event_date: Date;
  location: string | null;
  signups_open: boolean;
  created_at: Date;
  updated_at: Date;
};

export type SignupRow = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  item: string;
  category: SignupCategory;
  notes: string | null;
  created_at: Date;
};

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const rows = await db()
    .select()
    .from(events)
    .where(eq(events.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    event_date: row.event_date,
    location: row.location,
    signups_open: row.signups_open,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getEventById(id: string): Promise<EventRow | null> {
  const rows = await db()
    .select()
    .from(events)
    .where(eq(events.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    event_date: row.event_date,
    location: row.location,
    signups_open: row.signups_open,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function listEvents(): Promise<EventRow[]> {
  const rows = await db().select().from(events).orderBy(asc(events.event_date));
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    event_date: r.event_date,
    location: r.location,
    signups_open: r.signups_open,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getSignupsByEventId(eventId: string): Promise<SignupRow[]> {
  const rows = await db()
    .select()
    .from(eventSignups)
    .where(eq(eventSignups.event_id, eventId))
    .orderBy(asc(eventSignups.created_at));
  return rows.map((r) => ({
    id: r.id,
    event_id: r.event_id,
    name: r.name,
    email: r.email,
    item: r.item,
    category: r.category as SignupCategory,
    notes: r.notes,
    created_at: r.created_at,
  }));
}

export function groupSignupsByCategory(signups: SignupRow[]): Record<SignupCategory, SignupRow[]> {
  const grouped: Record<SignupCategory, SignupRow[]> = {
    sweet: [],
    savory: [],
    drink: [],
    utensils: [],
    other: [],
  };
  for (const s of signups) {
    grouped[s.category].push(s);
  }
  return grouped;
}

// Effective open state: event must be flagged open AND not yet past.
export function isSignupsEffectivelyOpen(event: EventRow, now: Date = new Date()): boolean {
  return event.signups_open && event.event_date.getTime() > now.getTime();
}

export type PerformanceRow = {
  id: string;
  event_id: string;
  name: string;
  email: string;
  kind: PerformanceKind;
  piece_title: string;
  estimated_minutes: number;
  content_warnings: string | null;
  notes: string | null;
  created_at: Date;
};

export async function getPerformanceSignupsByEventId(eventId: string): Promise<PerformanceRow[]> {
  const rows = await db()
    .select()
    .from(eventPerformanceSignups)
    .where(eq(eventPerformanceSignups.event_id, eventId))
    .orderBy(asc(eventPerformanceSignups.created_at));
  return rows.map((r) => ({
    id: r.id,
    event_id: r.event_id,
    name: r.name,
    email: r.email,
    kind: r.kind as PerformanceKind,
    piece_title: r.piece_title,
    estimated_minutes: r.estimated_minutes,
    content_warnings: r.content_warnings,
    notes: r.notes,
    created_at: r.created_at,
  }));
}

export function groupPerformancesByKind(
  performances: PerformanceRow[],
): Record<PerformanceKind, PerformanceRow[]> {
  const grouped: Record<PerformanceKind, PerformanceRow[]> = {
    poetry: [],
    storytelling: [],
    one_act_play: [],
  };
  for (const p of performances) {
    grouped[p.kind].push(p);
  }
  return grouped;
}

export function totalPerformanceMinutes(performances: PerformanceRow[]): number {
  return performances.reduce((sum, p) => sum + p.estimated_minutes, 0);
}

export { PERFORMANCE_KINDS };
