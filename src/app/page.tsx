import Link from 'next/link';
import { FileText, Users, BookOpen, Shield, PenLine } from 'lucide-react';
import { auth } from '@clerk/nextjs/server';
import { getCurrentUserRole } from '@/lib/actions/roles';

export default async function HomePage() {
  // Get user session and role
  const { userId } = await auth();

  let userRole = null;
  if (userId) {
    userRole = await getCurrentUserRole();
  }

  // Check user roles
  const isCommittee = userRole?.roles?.includes('committee');
  const isEditor = userRole?.positions?.includes('Editor-in-Chief');
  const isOfficer =
    userRole?.roles?.includes('officer') ||
    userRole?.positions?.some((p) =>
      ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'PR Nightmare'].includes(p)
    );

  return (
    <div className="space-y-12">

      {/* ── Masthead / Hero ── */}
      <section className="relative overflow-hidden">
        {/* Decorative background quote mark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-4 -right-2 select-none font-fraunces text-[16rem] leading-none text-white/[0.03]"
        >
          &ldquo;
        </div>

        {/* Org label */}
        <p className="mb-4 text-xs tracking-[0.2em] uppercase font-semibold text-[var(--accent)]">
          Hen &amp; Ink Society — AAP Georgetown
        </p>

        {/* Gold rule above headline */}
        <div className="mb-5 h-px bg-gradient-to-r from-[var(--accent)] via-[var(--accent)]/50 to-transparent" />

        {/* Main headline */}
        <h1 className="font-fraunces text-6xl sm:text-7xl font-black text-white tracking-tight leading-none mb-5">
          Chicken Scratch
        </h1>

        {/* Gold rule below headline */}
        <div className="mb-6 h-px bg-gradient-to-r from-[var(--accent)] via-[var(--accent)]/50 to-transparent" />

        {/* Italic Fraunces subhead */}
        <p className="font-fraunces text-xl sm:text-2xl italic text-gray-300 mb-5 max-w-2xl">
          UD&apos;s student-run literary &amp; arts zine — and the portal where it all happens.
        </p>

        {/* Body copy */}
        <p className="text-gray-400 leading-relaxed max-w-xl mb-8">
          This is where UD students submit poetry, fiction, essays, visual art, and photography
          for consideration in <em>Chicken Scratch</em>. Track your pieces, browse what&apos;s
          been published, and be part of something worth making.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap gap-4">
          <Link href="/submit" className="btn btn-accent">
            Submit your work
          </Link>
          <Link href="/issues" className="btn">
            Browse <em>Chicken Scratch</em>
          </Link>
        </div>
      </section>

      {/* ── Your Access (role cards) ── */}
      {userId && (isCommittee || isEditor || isOfficer) && (
        <section>
          <p className="mb-4 text-xs tracking-[0.2em] uppercase font-semibold text-[var(--accent)]">
            Your access
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isCommittee && (
              <Link
                href="/committee"
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-blue-500/30 hover:bg-white/10"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/20 p-2">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Creation Committee</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Review and discuss submissions with the Creation Committee.
                </p>
              </Link>
            )}

            {isEditor && (
              <Link
                href="/editor"
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-purple-500/30 hover:bg-white/10"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/20 p-2">
                    <BookOpen className="h-6 w-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Editor-in-Chief</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Oversee the editorial pipeline and export issue reports.
                </p>
              </Link>
            )}

            {isOfficer && (
              <Link
                href="/officers"
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-amber-500/30 hover:bg-white/10"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/20 p-2">
                    <Shield className="h-6 w-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Officers</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Coordinate society operations and leadership activities.
                </p>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── Main grid: portal info + quick links ── */}
      <div className="grid gap-8 md:grid-cols-2">

        {/* The submission portal */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-2 mb-1">
            <PenLine className="h-4 w-4 text-[var(--accent)]" />
            <p className="text-xs tracking-[0.2em] uppercase font-semibold text-[var(--accent)]">
              The submission portal
            </p>
          </div>
          <div className="mb-5 h-px bg-white/10" />
          <ul className="space-y-3 mb-6">
            <li className="flex gap-3 text-sm text-gray-300">
              <span className="text-[var(--accent)] font-bold shrink-0 mt-0.5">—</span>
              <span><strong className="text-white">Submit</strong> writing or visual art for the next issue.</span>
            </li>
            <li className="flex gap-3 text-sm text-gray-300">
              <span className="text-[var(--accent)] font-bold shrink-0 mt-0.5">—</span>
              <span><strong className="text-white">Track</strong> your pieces in <em>My Submissions</em>.</span>
            </li>
            <li className="flex gap-3 text-sm text-gray-300">
              <span className="text-[var(--accent)] font-bold shrink-0 mt-0.5">—</span>
              <span><strong className="text-white">Browse</strong> everything that&apos;s been published.</span>
            </li>
            {isCommittee && (
              <li className="flex gap-3 text-sm text-gray-300">
                <span className="text-[var(--accent)] font-bold shrink-0 mt-0.5">—</span>
                <span><strong className="text-white">Review</strong> and vote on incoming submissions.</span>
              </li>
            )}
            {isEditor && (
              <li className="flex gap-3 text-sm text-gray-300">
                <span className="text-[var(--accent)] font-bold shrink-0 mt-0.5">—</span>
                <span><strong className="text-white">Manage</strong> the full editorial pipeline.</span>
              </li>
            )}
            {isOfficer && (
              <li className="flex gap-3 text-sm text-gray-300">
                <span className="text-[var(--accent)] font-bold shrink-0 mt-0.5">—</span>
                <span><strong className="text-white">Coordinate</strong> society operations from the officers area.</span>
              </li>
            )}
          </ul>
          <Link href="/mine" className="btn text-sm">
            My Submissions
          </Link>
        </section>

        {/* Quick links */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="mb-1 text-xs tracking-[0.2em] uppercase font-semibold text-[var(--accent)]">
            Jump to
          </p>
          <div className="mb-5 h-px bg-white/10" />
          <div className="grid gap-2">
            <Link
              href="/mine"
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
            >
              <FileText className="h-5 w-5 text-[var(--accent)]" />
              <span className="font-medium text-white">My Submissions</span>
            </Link>
            <Link
              href="/published"
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
            >
              <BookOpen className="h-5 w-5 text-[var(--accent)]" />
              <span className="font-medium text-white">Browse <em>Chicken Scratch</em></span>
            </Link>
            {isEditor && (
              <Link
                href="/editor"
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
              >
                <BookOpen className="h-5 w-5 text-purple-400" />
                <span className="font-medium text-white">Editor Dashboard</span>
              </Link>
            )}
            {isCommittee && (
              <Link
                href="/committee"
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
              >
                <Users className="h-5 w-5 text-blue-400" />
                <span className="font-medium text-white">Committee</span>
              </Link>
            )}
            {isOfficer && (
              <Link
                href="/officers"
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
              >
                <Shield className="h-5 w-5 text-amber-400" />
                <span className="font-medium text-white">Officers</span>
              </Link>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
