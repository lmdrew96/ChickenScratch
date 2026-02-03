import Link from 'next/link';
import { FileText, Users, BookOpen, Shield } from 'lucide-react';
import PageHeader from '@/components/shell/page-header';
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
      ['BBEG', 'Dictator-in-Chief', 'Scroll Gremlin', 'Chief Hoarder', 'PR Nightmare'].includes(p)
    );

  return (
    <div className="space-y-8">
      <PageHeader title="Welcome to the Chicken Scratch Submissions Portal" />

      <p className="text-slate-300">
        This is your hub for sharing creative work with the Hen &amp; Ink community. Here you can
        submit new pieces, track your submissions, and explore what others have published.
      </p>

      {/* Role-based cards */}
      {userId && (isCommittee || isEditor || isOfficer) && (
        <section>
          <h2 className="mb-4 text-xl font-semibold" style={{ color: 'var(--accent)' }}>
            Your Roles
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {isCommittee && (
              <Link
                href="/committee"
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-white/20 hover:bg-white/10"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/20 p-2">
                    <Users className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Committee Members</h3>
                </div>
                <p className="text-sm text-slate-300">
                  Review submissions, coordinate with team members, and manage the editorial
                  workflow.
                </p>
              </Link>
            )}

            {isEditor && (
              <Link
                href="/editor"
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-white/20 hover:bg-white/10"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/20 p-2">
                    <BookOpen className="h-6 w-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Editor-in-Chief</h3>
                </div>
                <p className="text-sm text-slate-300">
                  Oversee the entire editorial process, manage submissions, and export reports.
                </p>
              </Link>
            )}

            {isOfficer && (
              <Link
                href="/officers"
                className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-all hover:border-white/20 hover:bg-white/10"
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/20 p-2">
                    <Shield className="h-6 w-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Officers</h3>
                </div>
                <p className="text-sm text-slate-300">
                  Collaborate with the leadership team. Schedule meetings, manage tasks, and
                  coordinate society operations.
                </p>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Main content grid */}
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-4 text-xl font-semibold" style={{ color: 'var(--accent)' }}>
            What you can do
          </h2>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="mt-1 text-[var(--accent)]">•</span>
              <span>
                <strong>Submit</strong> visual art or writing for consideration.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-[var(--accent)]">•</span>
              <span>
                <strong>Track</strong> the status of your pieces in <em>My Submissions</em>.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 text-[var(--accent)]">•</span>
              <span>
                <strong>Browse</strong> published work from the community.
              </span>
            </li>
            {isEditor && (
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[var(--accent)]">•</span>
                <span>
                  <strong>Review and provide feedback</strong> on assigned submissions.
                </span>
              </li>
            )}
            {isCommittee && (
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[var(--accent)]">•</span>
                <span>
                  <strong>Access planning resources</strong> and coordinate with the team.
                </span>
              </li>
            )}
            {isOfficer && (
              <li className="flex items-start gap-2">
                <span className="mt-1 text-[var(--accent)]">•</span>
                <span>
                  <strong>Manage society operations</strong> and coordinate leadership activities.
                </span>
              </li>
            )}
          </ul>

          <div className="mt-6 flex flex-wrap gap-4">
            <Link href="/submit" className="btn btn-accent">
              Submit your work
            </Link>
            <Link href="/published" className="btn">
              Browse published
            </Link>
          </div>
        </section>

        <section
          className="rounded-xl"
          style={{ border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.05)' }}
        >
          <div className="p-6">
            <h2 className="mb-4 text-xl font-semibold" style={{ color: 'var(--accent)' }}>
              Quick links
            </h2>
            <div className="grid gap-3">
              <Link
                href="/mine"
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:bg-white/10"
              >
                <FileText className="h-5 w-5 text-[var(--accent)]" />
                <span className="font-medium text-white">My Submissions</span>
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
            {(isEditor || isCommittee || isOfficer) && (
              <p className="mt-4 text-sm text-slate-400">
                Role-specific areas are shown based on your account permissions.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
