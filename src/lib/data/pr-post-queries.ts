import { and, gte, lte } from 'drizzle-orm';
import { db } from '@/lib/db';
import { prPosts } from '@/lib/db/schema';

export type PrPostStatus = 'empty' | 'drafted' | 'scheduled' | 'posted';

export type PrPostRow = {
  id: string;
  scheduled_for: Date;
  status: PrPostStatus;
  title: string | null;
  draft_text: string | null;
  channels: string[];
  template: string | null;
  notes: string | null;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - diff);
  return d;
}

export function buildCalendarSlots(now: Date = new Date(), weeks = 3): Date[] {
  const start = startOfWeek(now);
  const slots: Date[] = [];
  for (let w = 0; w < weeks; w++) {
    for (const dayOffset of [0, 2, 4]) {
      // Mon = 0, Wed = 2, Fri = 4
      const d = new Date(start.getTime() + (w * 7 + dayOffset) * MS_PER_DAY);
      d.setHours(9, 0, 0, 0);
      slots.push(d);
    }
  }
  return slots;
}

export async function getPrPostsForRange(start: Date, end: Date): Promise<PrPostRow[]> {
  const rows = await db()
    .select()
    .from(prPosts)
    .where(and(gte(prPosts.scheduled_for, start), lte(prPosts.scheduled_for, end)))
    .orderBy(prPosts.scheduled_for);
  return rows.map((r) => ({
    id: r.id,
    scheduled_for: r.scheduled_for,
    status: r.status as PrPostStatus,
    title: r.title,
    draft_text: r.draft_text,
    channels: (r.channels as string[] | null) ?? [],
    template: r.template,
    notes: r.notes,
  }));
}
