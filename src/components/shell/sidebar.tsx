'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Drawer from '@/components/ui/drawer';
import { useSupabase } from '@/components/providers/supabase-provider';

const LINKS = [
  { href: '/published', label: 'Published' },
  { href: '/submit', label: 'Submit' },
  { href: '/mine', label: 'My submissions' },
  { href: '/editor', label: 'Editorial dashboard' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const supabase = useSupabase();
  const [authed, setAuthed] = useState(false);
  const [open, setOpen] = useState(false); // mobile drawer

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => { if (alive) setAuthed(!!data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => { alive = false; sub.subscription.unsubscribe(); };
  }, [supabase]);

  // Allow PageHeader "Menu" button to open the drawer
  useEffect(() => {
    const handler = () => setOpen(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('open-sidebar-drawer', handler as unknown as EventListener);
      return () => window.removeEventListener('open-sidebar-drawer', handler as unknown as EventListener);
    }
  }, []);

  function NavList({ onNav }: { onNav?: () => void }) {
    return (
      <nav className="p-3 space-y-1">
        {LINKS.map((l) => {
          const active = pathname?.startsWith(l.href);
          const cls = [
            'block rounded-lg px-3 py-2 no-underline',
            active ? 'nav-active' : 'text-slate-300 hover:bg-white/10 hover:text-white',
          ].join(' ');
          return (
            <Link key={l.href} href={l.href} onClick={onNav} className={cls}>
              {l.label}
            </Link>
          );
        })}
<div className="pt-2">
          {authed ? (
            <button
              className="btn w-full"
              onClick={async () => { await supabase.auth.signOut(); location.assign('/'); }}
            >
              Sign out
            </button>
          ) : (
            <Link href="/login" onClick={onNav} className="btn btn-brand w-full text-center">
              Sign in
            </Link>
          )}
        </div>
      </nav>
    );
  }

  return (
    <>
      {/* Desktop: fixed left rail (18rem) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-[100dvh] w-[18rem] border-r border-white/10 bg-[rgba(13,20,34,0.92)] flex-col sidebar">
        <div className="flex items-center gap-2 h-16 px-4 border-b border-white/10">
          <Link href="/" className="no-underline flex items-center gap-2">
            <img src="/brand-logo.png" alt="Chicken Scratch logo" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-semibold tracking-tight text-white">Chicken Scratch</span>
          </Link>
        </div>
        <NavList />
      </aside>

      <Drawer open={open} onOpenChange={setOpen} title="Navigate">
        <div id="site-drawer">
          <NavList onNav={() => setOpen(false)} />
        </div>
      </Drawer>
    </>
  );
}
