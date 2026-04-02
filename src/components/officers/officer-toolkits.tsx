'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { BookOpen, Crown, Coins, Scroll, Megaphone } from 'lucide-react';
import { officerToolkits } from '@/lib/data/toolkits';

const iconMap: Record<string, ReactNode> = {
  'president': <Crown className="h-5 w-5 text-[var(--accent)]" />,
  'treasurer': <Coins className="h-5 w-5 text-[var(--accent)]" />,
  'secretary': <Scroll className="h-5 w-5 text-[var(--accent)]" />,
  'pr-chair': <Megaphone className="h-5 w-5 text-[var(--accent)]" />,
};

export function OfficerToolkits() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[var(--text)] flex items-center gap-2">
        <BookOpen className="h-5 w-5" />
        Officer Toolkits
      </h2>
      <p className="text-sm text-slate-300 mb-4">
        Everything you need to survive your role and hand it off securely.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {officerToolkits.map((toolkit) => (
          <Link
            key={toolkit.slug}
            href={`/officers/toolkits/${toolkit.slug}`}
            className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition-all hover:-translate-y-1 group"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-lg bg-white/10 p-2 group-hover:bg-[var(--accent)]/20 transition-colors">
                {iconMap[toolkit.slug] || <BookOpen className="h-5 w-5 text-white" />}
              </div>
              <div>
                <h3 className="font-semibold text-white">{toolkit.roleName}</h3>
                <p className="text-xs text-[var(--accent)] uppercase font-semibold">{toolkit.title}</p>
              </div>
            </div>
            <p className="text-sm text-slate-400 line-clamp-2">
              {toolkit.overview}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
