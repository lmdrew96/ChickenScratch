'use client';

import Link from 'next/link';
import { BookOpen, ChevronDown, ExternalLink, Settings } from 'lucide-react';

type RoleReferenceProps = {
  overview: string;
  responsibilities: string[];
  handoffChecklist: string[];
  quickLinks: { label: string; configKey: string; url: string | null }[];
  isAdmin: boolean;
};

function Accordion({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details
      className="group rounded-xl border border-white/10 bg-white/5 overflow-hidden"
      open={defaultOpen}
    >
      <summary className="px-4 py-3 cursor-pointer font-semibold text-white hover:bg-white/10 transition-colors flex items-center justify-between list-none">
        <span>{title}</span>
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 text-slate-400" />
      </summary>
      <div className="px-4 pb-4 pt-2 border-t border-white/10">{children}</div>
    </details>
  );
}

export function RoleReference({ overview, responsibilities, handoffChecklist, quickLinks, isAdmin }: RoleReferenceProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-[var(--accent)]" />
        Role Reference
      </h3>
      <div className="space-y-3">
        <Accordion title="Role Overview" defaultOpen>
          <p className="text-slate-300 leading-relaxed">{overview}</p>
        </Accordion>

        <Accordion title="Core Responsibilities">
          <ul className="space-y-2">
            {responsibilities.map((item, i) => (
              <li key={i} className="flex gap-3 text-slate-300 text-sm">
                <span className="text-emerald-400 mt-0.5">&#x2022;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Accordion>

        <Accordion title="Handoff Checklist">
          <p className="text-xs text-slate-400 mb-3">
            For outgoing officers: ensure these items are completed before your successor takes over.
          </p>
          <ul className="space-y-2">
            {handoffChecklist.map((item, i) => (
              <li key={i} className="flex gap-3 text-slate-300 text-sm items-start">
                <input type="checkbox" className="mt-1 bg-white/10 border-white/20 rounded" disabled />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Accordion>

        <Accordion title="Quick Links">
          <div className="space-y-2">
            {quickLinks.map((link, i) => {
              const adminHref = '/admin#toolkit-links';
              return (
                <div
                  key={i}
                  className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border ${
                    link.url
                      ? 'bg-white/5 border-white/10'
                      : 'bg-amber-400/5 border-amber-400/30'
                  }`}
                >
                  <span className="text-sm font-medium text-white">{link.label}</span>
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold px-3 py-1 rounded bg-[var(--accent)] text-white hover:opacity-90 transition-opacity inline-flex items-center gap-1 min-h-[32px]"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open
                    </a>
                  ) : isAdmin ? (
                    <Link
                      href={adminHref}
                      className="text-xs font-semibold px-3 py-1 rounded bg-amber-400/20 text-amber-200 hover:bg-amber-400/30 border border-amber-400/40 transition-colors inline-flex items-center gap-1 min-h-[32px]"
                    >
                      <Settings className="h-3 w-3" />
                      Set URL
                    </Link>
                  ) : (
                    <span className="text-xs text-amber-300/80 italic px-3 py-1">
                      Not yet configured — ask an admin
                    </span>
                  )}
                </div>
              );
            })}
            {quickLinks.length === 0 && (
              <p className="text-sm text-slate-400 italic">No quick links for this role.</p>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-white/10 text-center">
            Admins can configure these links in the Admin panel.
          </p>
        </Accordion>
      </div>
    </div>
  );
}
