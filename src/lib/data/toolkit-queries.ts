import { eq, ne, and, or, gte, gt, isNull, isNotNull, count, desc, asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { officerTasks, submissions, meetingProposals, officerAnnouncements, profiles } from '@/lib/db/schema';

// ── Types ──

export type TaskSummary = {
  id: string;
  title: string;
  status: string | null;
  priority: string | null;
  due_date: Date | null;
};

export type SubmissionSummary = {
  id: string;
  title: string;
  type: string;
  status: string | null;
  committee_status: string | null;
  created_at: Date | null;
  owner_name: string | null;
};

export type MeetingSummary = {
  id: string;
  title: string;
  finalized_date: Date | null;
  proposed_dates: unknown[];
  is_finalized: boolean;
};

export type RoleStats = {
  submissionsThisMonth: number;
  pendingReviews: number;
  upcomingMeetings?: number;
  openTasks?: number;
  totalUsers?: number;
  publishedPieces?: number;
};

export type AnnouncementSummary = {
  id: string;
  message: string;
  author_name: string | null;
  created_at: Date | null;
};

// ── Queries ──

export async function getMyTasks(userId: string): Promise<TaskSummary[]> {
  const database = db();
  return database
    .select({
      id: officerTasks.id,
      title: officerTasks.title,
      status: officerTasks.status,
      priority: officerTasks.priority,
      due_date: officerTasks.due_date,
    })
    .from(officerTasks)
    .where(and(eq(officerTasks.assigned_to, userId), ne(officerTasks.status, 'done')))
    .orderBy(asc(officerTasks.due_date));
}

export async function getPendingSubmissions(): Promise<SubmissionSummary[]> {
  const database = db();
  const rows = await database
    .select({
      id: submissions.id,
      title: submissions.title,
      type: submissions.type,
      status: submissions.status,
      committee_status: submissions.committee_status,
      created_at: submissions.created_at,
      owner_name: profiles.name,
    })
    .from(submissions)
    .leftJoin(profiles, eq(submissions.owner_id, profiles.id))
    .where(
      and(
        ne(submissions.status, 'withdrawn'),
        or(
          isNull(submissions.committee_status),
          eq(submissions.committee_status, 'pending_coordinator'),
          eq(submissions.committee_status, 'with_coordinator'),
          eq(submissions.committee_status, 'coordinator_approved'),
          eq(submissions.committee_status, 'changes_requested'),
          eq(submissions.committee_status, 'proofreader_committed'),
        )
      )
    )
    .orderBy(desc(submissions.created_at))
    .limit(10);
  return rows;
}

export async function getNextMeeting(): Promise<MeetingSummary | null> {
  const database = db();
  const now = new Date();
  const rows = await database
    .select({
      id: meetingProposals.id,
      title: meetingProposals.title,
      finalized_date: meetingProposals.finalized_date,
      proposed_dates: meetingProposals.proposed_dates,
      finalized_at: meetingProposals.finalized_at,
    })
    .from(meetingProposals)
    .where(
      and(
        isNull(meetingProposals.archived_at),
        or(
          gt(meetingProposals.finalized_date, now),
          isNull(meetingProposals.finalized_date),
        )
      )
    )
    .orderBy(asc(meetingProposals.finalized_date))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0]!;
  return {
    id: row.id,
    title: row.title,
    finalized_date: row.finalized_date,
    proposed_dates: Array.isArray(row.proposed_dates) ? row.proposed_dates : [],
    is_finalized: row.finalized_at != null,
  };
}

export async function getRoleStats(slug: string): Promise<RoleStats> {
  const database = db();
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Base queries all roles need
  const baseQueries = [
    database.select({ count: count() }).from(submissions).where(
      and(ne(submissions.status, 'withdrawn'), gte(submissions.created_at, firstDayOfMonth))
    ),
    database.select({ count: count() }).from(submissions).where(
      and(
        ne(submissions.status, 'withdrawn'),
        or(
          isNull(submissions.committee_status),
          eq(submissions.committee_status, 'pending_coordinator'),
          eq(submissions.committee_status, 'with_coordinator'),
          eq(submissions.committee_status, 'coordinator_approved'),
          eq(submissions.committee_status, 'changes_requested'),
          eq(submissions.committee_status, 'proofreader_committed'),
        )
      )
    ),
  ] as const;

  // Role-specific extras
  const extras: Promise<{ count: number }[]>[] = [];
  const extraKeys: string[] = [];

  if (slug === 'president') {
    extras.push(
      database.select({ count: count() }).from(meetingProposals).where(
        and(isNull(meetingProposals.archived_at), gt(meetingProposals.finalized_date, now))
      )
    );
    extraKeys.push('upcomingMeetings');
    extras.push(
      database.select({ count: count() }).from(officerTasks).where(ne(officerTasks.status, 'done'))
    );
    extraKeys.push('openTasks');
  } else if (slug === 'treasurer') {
    extras.push(database.select({ count: count() }).from(profiles));
    extraKeys.push('totalUsers');
  } else if (slug === 'secretary') {
    extras.push(database.select({ count: count() }).from(profiles));
    extraKeys.push('totalUsers');
    extras.push(
      database.select({ count: count() }).from(submissions).where(eq(submissions.published, true))
    );
    extraKeys.push('publishedPieces');
  } else if (slug === 'pr-chair') {
    extras.push(
      database.select({ count: count() }).from(submissions).where(eq(submissions.published, true))
    );
    extraKeys.push('publishedPieces');
  }

  const [baseResults, extraResults] = await Promise.all([
    Promise.all(baseQueries),
    Promise.all(extras),
  ]);

  const stats: RoleStats = {
    submissionsThisMonth: baseResults[0][0]?.count || 0,
    pendingReviews: baseResults[1][0]?.count || 0,
  };

  extraKeys.forEach((key, i) => {
    (stats as Record<string, number>)[key] = extraResults[i]?.[0]?.count || 0;
  });

  return stats;
}

export async function getRecentAnnouncements(limit = 3): Promise<AnnouncementSummary[]> {
  const database = db();
  return database
    .select({
      id: officerAnnouncements.id,
      message: officerAnnouncements.message,
      author_name: profiles.name,
      created_at: officerAnnouncements.created_at,
    })
    .from(officerAnnouncements)
    .leftJoin(profiles, eq(officerAnnouncements.created_by, profiles.id))
    .orderBy(desc(officerAnnouncements.created_at))
    .limit(limit);
}
