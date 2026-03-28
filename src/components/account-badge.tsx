import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import { ensureProfile } from '@/lib/auth/clerk';
import { db } from '@/lib/db';
import { notifications } from '@/lib/db/schema';
import AccountBadgeDropdown from './account-badge-dropdown';

export default async function AccountBadge() {
  const { userId } = await auth();
  if (!userId) return null;

  const profile = await ensureProfile(userId);
  if (!profile) return null;

  const fullName = profile.full_name || 'User';
  const initials =
    fullName
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U';

  const [initialNotifications, countRows] = await Promise.all([
    db()
      .select()
      .from(notifications)
      .where(eq(notifications.recipient_id, profile.id))
      .orderBy(desc(notifications.created_at))
      .limit(10),
    db()
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.recipient_id, profile.id), isNull(notifications.read_at))),
  ]);
  const unreadCount = Number(countRows[0]?.count ?? 0);

  return (
    <AccountBadgeDropdown
      avatarUrl={profile.avatar_url ?? null}
      initials={initials}
      name={fullName}
      pronouns={profile.pronouns ?? null}
      initialNotifications={initialNotifications}
      unreadCount={unreadCount}
    />
  );
}
