'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/components/providers/supabase-provider';

const links = [
  { href: '/published', label: 'Published' },
  { href: '/submit', label: 'Submit' },
  { href: '/mine', label: 'My submissions' },
  { href: '/editor', label: 'Editorial dashboard' },
];

export default function SiteNav() {
  const pathname = usePathname();
  const supabase = useSupabase();
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setAuthed(!!data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => setAuthed(!!session));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [supabase]);

  return (
    <header className="nav">
      <nav className="container flex h-16 items-center justify-between gap-3">
        <Link href="/" className="no-underline flex items-center gap-2">
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-lg font-bold text-sm"
            style={{ background: 'var(--accent)', color: 'black' }}
          >
            CS
          </span>
          <span className="font-semibold tracking-tight text-white">Chicken Scratch</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {links.map(l => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`nav-link ${active ? 'nav-active' : ''}`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {authed ? (
            <button
              className="btn btn-accent"
              onClick={async () => { await supabase.auth.signOut(); location.assign('/'); }}
            >
              Sign out
            </button>
          ) : (
            <Link href="/login" className="btn btn-brand">Sign in</Link>
          )}
        </div>
      </nav>
    </header>
  );
}
