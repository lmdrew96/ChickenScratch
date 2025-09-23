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
        

      </div>
    </header>
  );
}
