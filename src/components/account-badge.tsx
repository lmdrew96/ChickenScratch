import Link from 'next/link';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';

export default async function AccountBadge() {
  const supabase = await createSupabaseServerReadOnlyClient();
  if (!supabase) return null;

  let user = null as null | { id: string; email?: string | null; user_metadata?: Record<string, any> };
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    return null;
  }
  if (!user) return null;

  let avatarUrl: string | null = null;
  let fullName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    user.email ||
    'User';

  try {
    const { data: prof } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    if (prof?.avatar_url) avatarUrl = prof.avatar_url;
    if (prof?.full_name) fullName = prof.full_name;
  } catch {}

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
      style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 50 }}
      prefetch={false}
    >
      <span className="sr-only">Your account</span>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt=""
          className="h-8 w-8 rounded-full ring-2 ring-[--accent] object-cover"
        />
      ) : (
        <span className="h-8 w-8 rounded-full grid place-items-center font-semibold bg-[--accent] text-[--brand]">
          {initials}
        </span>
      )}
    </Link>
  );
}
