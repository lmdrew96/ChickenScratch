import PageHeader from '@/components/shell/page-header';
import { requireRole } from '@/lib/auth/guards';

const unassignedPlaceholders = [
  { title: 'Illustration: Midnight Market', meta: 'Awaiting assignment' },
  { title: 'Poem: Tidepool Songs', meta: 'Submitted 2 days ago' },
  { title: 'Photography: Glass reflections', meta: 'New arrival' },
];

const reviewPlaceholders = [
  { title: 'Essay: Winter on the Green', meta: 'Needs editorial review' },
  { title: 'Comic: Seven Panels', meta: 'Revision requested' },
  { title: 'Story: The Last Streetcar', meta: 'Ready for vote' },
];

export default async function EditorPage() {
  await requireRole(['editor', 'committee'], '/editor');

  return (
    <div className="space-y-6">
      <PageHeader title="Editor Dashboard" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
          <header className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--text)]">Unassigned submissions</h2>
            <p className="text-sm text-slate-300">Pieces that still need an editor.</p>
          </header>
          <ul className="space-y-3 text-sm text-slate-200">
            {unassignedPlaceholders.map((item) => (
              <li key={item.title} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-semibold text-[var(--text)]">{item.title}</p>
                <p className="text-xs text-slate-300">{item.meta}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
          <header className="mb-4">
            <h2 className="text-xl font-semibold text-[var(--text)]">Needs review</h2>
            <p className="text-sm text-slate-300">Upcoming feedback and decisions.</p>
          </header>
          <ul className="space-y-3 text-sm text-slate-200">
            {reviewPlaceholders.map((item) => (
              <li key={item.title} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="font-semibold text-[var(--text)]">{item.title}</p>
                <p className="text-xs text-slate-300">{item.meta}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
