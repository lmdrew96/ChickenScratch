'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import Drawer from '@/components/ui/drawer';

const LINKS = [
  { href: '/published', label: 'Published' },
  { href: '/submit', label: 'Submit' },
  { href: '/mine', label: 'My submissions' },
  { href: '/editor', label: 'Editorial dashboard' },
  { href: '/login', label: 'Sign in' },
];

export default function SiteHeader() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  return (
    <>
      <header className="nav">
        <div className="container flex h-16 items-center justify-between gap-3">
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
          <button
            className="btn btn-brand"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="site-drawer"
            aria-label="Open menu"
          >
            {/* hamburger icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Menu
          </button>
        </div>
      </header>

      <Drawer open={open} onOpenChange={setOpen} title="Navigate">
        <nav id="site-drawer" className="space-y-1">
          {LINKS.map((l) => {
            const active = pathname?.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={[
                  'block rounded-lg px-3 py-2 no-underline',
                  active
                    ? 'bg-[rgba(0,83,159,0.30)] text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white',
                ].join(' ')}
              >
                {l.label}
              </Link>
            );
          })}

          <div className="pt-2">
            <Link href="/submit" onClick={() => setOpen(false)} className="btn btn-accent w-full text-center">
              Submit your work
            </Link>
          </div>
        </nav>
      </Drawer>
    </>
  );
}
