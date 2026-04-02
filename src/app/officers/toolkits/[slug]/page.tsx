import { notFound } from 'next/navigation';
import { officerToolkits } from '@/lib/data/toolkits';
import { requireOfficerRole } from '@/lib/auth/guards';
import { getSiteConfigValue } from '@/lib/site-config';
import PageHeader from '@/components/shell/page-header';
import { BookOpen, CheckSquare, Clock, ExternalLink } from 'lucide-react';

export default async function ToolkitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireOfficerRole(`/officers/toolkits/${slug}`);

  const toolkit = officerToolkits.find((t) => t.slug === slug);
  if (!toolkit) {
    notFound();
  }

  // Fetch all link URLs from site config
  const linksWithUrls = await Promise.all(
    toolkit.quickLinks.map(async (link) => {
      const url = await getSiteConfigValue(link.configKey);
      return { ...link, url };
    })
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`${toolkit.title} Toolkit`}
        description={toolkit.roleName}
        showBackButton
        backButtonHref="/officers"
        backButtonLabel="Back to Officers"
      />

      {/* Overview */}
      <div className="rounded-2xl border border-white/10 bg-[var(--accent)]/10 p-6">
        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[var(--accent)]" />
          Role Overview
        </h2>
        <p className="text-slate-300 leading-relaxed">{toolkit.overview}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Core Responsibilities */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-emerald-400" />
            Core Responsibilities
          </h2>
          <ul className="space-y-3">
            {toolkit.responsibilities.map((task, i) => (
              <li key={i} className="flex gap-3 text-slate-300">
                <span className="text-emerald-400 mt-1">•</span>
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Recurring Tasks */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            Recurring Tasks
          </h2>
          <div className="space-y-4">
            {toolkit.recurringTasks.map((recurring, i) => (
              <div key={i} className="border-l-2 border-[var(--accent)]/30 pl-4 py-1">
                <h3 className="font-semibold text-white text-sm uppercase tracking-wider mb-1">{recurring.cadence}</h3>
                <p className="text-slate-300 text-sm">{recurring.tasks}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Handoff Checklist */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4">Handoff Checklist</h2>
          <p className="text-sm text-slate-400 mb-4 pb-4 border-b border-white/10">
            For outgoing officers: ensure these items are completed before your successor takes over!
          </p>
          <ul className="space-y-3">
            {toolkit.handoffChecklist.map((item, i) => (
              <li key={i} className="flex gap-3 text-slate-300 items-start">
                <input type="checkbox" className="mt-1 bg-white/10 border-white/20 rounded" disabled />
                <span className="text-sm">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Quick Links */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-blue-400" />
            Quick Links
          </h2>
          <div className="space-y-3">
            {linksWithUrls.map((link, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                <span className="text-sm font-medium text-white">{link.label}</span>
                {link.url ? (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold px-3 py-1 rounded bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
                  >
                    Open
                  </a>
                ) : (
                  <span className="text-xs text-slate-500 italic px-3 py-1">Not configured</span>
                )}
              </div>
            ))}
            {linksWithUrls.length === 0 && (
              <p className="text-sm text-slate-400 italic">No quick links needed for this role.</p>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-white/10 text-center">
            Admins can configure these links in the Admin panel.
          </p>
        </div>
      </div>
    </div>
  );
}
