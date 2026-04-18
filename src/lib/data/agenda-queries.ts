import { and, desc, eq, gt, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { meetingAgendas, meetingProposals, creativePrompts } from '@/lib/db/schema';

export type NextMeetingForAgenda = {
  id: string;
  title: string;
  finalized_date: Date | null;
  draft_md: string;
  finalized_at: Date | null;
};

export async function getNextMeetingAgenda(now: Date = new Date()): Promise<NextMeetingForAgenda | null> {
  const rows = await db()
    .select({
      meeting_id: meetingProposals.id,
      title: meetingProposals.title,
      finalized_date: meetingProposals.finalized_date,
      agenda_id: meetingAgendas.id,
      draft_md: meetingAgendas.draft_md,
      finalized_at: meetingAgendas.finalized_at,
    })
    .from(meetingProposals)
    .leftJoin(meetingAgendas, eq(meetingAgendas.meeting_id, meetingProposals.id))
    .where(
      and(
        isNull(meetingProposals.archived_at),
        or(gt(meetingProposals.finalized_date, now), isNull(meetingProposals.finalized_date)),
      ),
    )
    .orderBy(sql`${meetingProposals.finalized_date} ASC NULLS LAST`)
    .limit(1);
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    id: r.meeting_id,
    title: r.title,
    finalized_date: r.finalized_date,
    draft_md: r.draft_md ?? '',
    finalized_at: r.finalized_at ?? null,
  };
}

export type CreativePromptRow = {
  id: string;
  text: string;
  tags: string[];
  first_used_at: Date | null;
  last_used_at: Date | null;
  created_at: Date;
};

export async function listCreativePrompts(): Promise<CreativePromptRow[]> {
  const rows = await db()
    .select()
    .from(creativePrompts)
    .orderBy(desc(creativePrompts.last_used_at), desc(creativePrompts.created_at));
  return rows.map((r) => ({ ...r, tags: (r.tags as string[] | null) ?? [] }));
}
