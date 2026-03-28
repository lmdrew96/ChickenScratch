import { and, asc, eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

import { db } from '@/lib/db';
import { comments, profiles } from '@/lib/db/schema';
import { ensureProfile } from '@/lib/auth/clerk';
import { getUserRole } from '@/lib/actions/roles';
import { hasMemberOrAlumniAccess, hasOfficerAccess } from '@/lib/auth/guards';
import CommentsClient, { type CommentRow } from './comments-client';

type Props = {
  targetType: 'submission' | 'issue';
  targetId: string;
};

export async function CommentsSection({ targetType, targetId }: Props) {
  // Load existing comments with author name + pronouns
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

  // Resolve current user's permissions
  const { userId: clerkId } = await auth();
  let canPost = false;
  let canModerate = false;
  let currentUserId: string | null = null;

  if (clerkId) {
    const profile = await ensureProfile(clerkId);
    if (profile) {
      currentUserId = profile.id;
      const role = await getUserRole(profile.id);
      canPost     = hasMemberOrAlumniAccess(role.is_member, role.is_alumni);
      canModerate = hasOfficerAccess(role.positions as string[], role.roles as string[]);
    }
  }

  return (
    <CommentsClient
      initialComments={rows as CommentRow[]}
      targetType={targetType}
      targetId={targetId}
      canPost={canPost}
      canModerate={canModerate}
      currentUserId={currentUserId}
    />
  );
}
