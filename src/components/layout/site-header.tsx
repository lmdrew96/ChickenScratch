'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@clerk/nextjs';

import type { Profile } from '@/types/database';

const navBase = [{ href: '/published', label: 'Published' }];

export function SiteHeader({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const role = profile?.role ?? 'student';
  const links = [...navBase];

  if (profile) {
    links.push({ href: '/submit', label: 'Submit' }, { href: '/mine', label: 'My submissions' });
    if (role === 'editor' || role === 'admin') {
      links.push({ href: '/editor', label: 'Editorial dashboard' });
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <header className="border-b border-white/10 bg-slate-900/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href={profile ? (role === 'editor' || role === 'admin' ? '/editor' : '/mine') : '/published'}
          className="text-lg font-semibold tracking-tight text-amber-200 drop-shadow transition hover:text-amber-100"
        >
          Chicken Scratch
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-white/70" role="navigation" aria-label="Header navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`transition hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900 rounded px-2 py-1 ${
                isActive(link.href) ? 'text-amber-200 font-semibold' : ''
              }`}
              aria-current={isActive(link.href) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
          {profile ? (
            <SignOutButton redirectUrl="/login">
              <button
                type="button"
                className="rounded-md border border-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition hover:border-white/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Sign out
              </button>
            </SignOutButton>
          ) : (
            <Link
              href="/login"
              className="rounded-md border border-amber-400/60 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-200 transition hover:border-amber-300 hover:bg-amber-400/10 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-slate-900"
            >
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
