import { auth } from '@clerk/nextjs/server';
import { ensureProfile } from '@/lib/auth/clerk';
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

  return (
    <AccountBadgeDropdown
      avatarUrl={profile.avatar_url ?? null}
      initials={initials}
      name={fullName}
      pronouns={profile.pronouns ?? null}
    />
  );
}
