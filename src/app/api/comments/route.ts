import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { comments, profiles, submissions } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { getUserRole } from '@/lib/actions/roles';
import { hasMemberOrAlumniAccess } from '@/lib/auth/guards';
import { insertNotification } from '@/lib/actions/notifications';

const MAX_BODY_LENGTH = 1000;

// GET /api/comments?targetType=submission&targetId=<uuid>
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetType = searchParams.get('targetType');
  const targetId   = searchParams.get('targetId');

  if (!targetType || !targetId) {
    return NextResponse.json({ error: 'Missing targetType or targetId' }, { status: 400 });
  }

  try {
    const rows = await db()
      .select({
        id:              comments.id,
        body:            comments.body,
        created_at:      comments.created_at,
        author_id:       comments.author_id,
        author_name:     profiles.full_name,
        author_pronouns: profiles.pronouns,
      })
      .from(comments)
      .innerJoin(profiles, eq(comments.author_id, profiles.id))
      .where(and(eq(comments.target_type, targetType), eq(comments.target_id, targetId)))
      .orderBy(asc(comments.created_at));

    return NextResponse.json({ comments: rows });
  } catch (err) {
    console.error('[GET /api/comments]', err);
    return NextResponse.json({ error: 'Failed to load comments' }, { status: 500 });
  }
}

// POST /api/comments  { targetType, targetId, body }
export async function POST(req: NextRequest) {
  const { userId: clerkId } = await auth();
  if (!clerkId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const profile = await ensureProfile(clerkId);
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 401 });

  const role = await getUserRole(profile.id);
  if (!hasMemberOrAlumniAccess(role.is_member, role.is_alumni)) {
    return NextResponse.json({ error: 'Members and alumni only' }, { status: 403 });
  }

  let body: string, targetType: string, targetId: string;
  try {
    ({ body, targetType, targetId } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const trimmed = (body ?? '').trim();
  if (!trimmed) return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
  if (trimmed.length > MAX_BODY_LENGTH) {
    return NextResponse.json({ error: `Comment must be ${MAX_BODY_LENGTH} characters or less` }, { status: 400 });
  }
  if (!targetType || !targetId) {
    return NextResponse.json({ error: 'Missing targetType or targetId' }, { status: 400 });
  }

  try {
    const [comment] = await db()
      .insert(comments)
      .values({ author_id: profile.id, target_type: targetType, target_id: targetId, body: trimmed })
      .returning();

    // Notify submission owner when someone comments on their work (not self, not issues)
    if (targetType === 'submission') {
      const subRow = await db()
        .select({ owner_id: submissions.owner_id, title: submissions.title })
        .from(submissions)
        .where(eq(submissions.id, targetId))
        .limit(1);
      const sub = subRow[0];
      if (sub && sub.owner_id !== profile.id) {
        void insertNotification(
          sub.owner_id,
          'comment',
          `New comment on "${sub.title}"`,
          trimmed.length > 80 ? trimmed.slice(0, 80) + '…' : trimmed,
          `/published/${targetId}`,
        ).catch(() => {});
      }
    }

    return NextResponse.json({
      comment: {
        ...comment,
        author_name:     profile.full_name,
        author_pronouns: profile.pronouns ?? null,
      },
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/comments]', err);
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}
