import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@clerk/nextjs/server';
import { ensureProfile } from '@/lib/auth/clerk';

export default async function AccountBadge() {
  const { userId } = await auth();
  if (!userId) return null;

  const profile = await ensureProfile(userId);
  if (!profile) return null;

  const avatarUrl = profile.avatar_url ?? null;
  const fullName = profile.full_name || 'User';

  const initials =
    (fullName ?? 'User')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U';

  return (
    <Link
      href="/account"
      aria-label="Your account"
      className="account-badge"
      prefetch={false}
    >
      <span className="sr-only">Your account</span>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={32}
          height={32}
          className="rounded-full"
          unoptimized
        />
      ) : (
        <span>
          {initials}
        </span>
      )}
    </Link>
  );
}
