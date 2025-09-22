import Link from 'next/link';

import { signOutAction } from '@/lib/actions/auth';
import type { Profile } from '@/types/database';

const navBase = [{ href: '/published', label: 'Published' }];

export function SiteHeader({ profile }: { profile: Profile | null }) {
  const role = profile?.role ?? 'student';
  const links = [...navBase];

  if (profile) {
    links.push({ href: '/submit', label: 'Submit' }, { href: '/mine', label: 'My submissions' });
    if (role === 'editor' || role === 'admin') {
      links.push({ href: '/editor', label: 'Editorial dashboard' });
    }
  }

  return (
    <header className="border-b border-white/10 bg-slate-900/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href={profile ? (role === 'editor' || role === 'admin' ? '/editor' : '/mine') : '/published'}
          className="text-lg font-semibold tracking-tight text-amber-200 drop-shadow"
        >
          Chicken Scratch
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-white/70">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </Link>
          ))}
          {profile ? (
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/40 hover:bg-white/10"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-amber-400/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200 transition hover:border-amber-300 hover:bg-amber-400/10"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
