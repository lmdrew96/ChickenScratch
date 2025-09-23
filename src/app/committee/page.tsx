import PageHeader from '@/components/shell/page-header';
import { requireRole } from '@/lib/auth/guards';

const meetingNotes = [
  { title: 'Agenda draft', detail: 'Finalize guest speaker list' },
  { title: 'Action items', detail: 'Assign layout leads for Issue 3' },
];

const issuePlanning = [
  { title: 'Theme exploration', detail: 'Collect ideas for spring edition' },
  { title: 'Budget check-in', detail: 'Review printing estimates' },
];

const styleGuide = [
  { title: 'Typography updates', detail: 'Confirm body copy sizes' },
  { title: 'Color accents', detail: 'Align palette with new poster series' },
];

export default async function CommitteePage() {
  await requireRole('committee', '/committee');

  return (
    <div className="space-y-6">
      <PageHeader title="Committee" />
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard heading="Meeting notes" items={meetingNotes} />
        <SectionCard heading="Issue planning" items={issuePlanning} />
        <SectionCard heading="Style guide" items={styleGuide} />
      </div>
    </div>
  );
}

type SectionCardProps = {
  heading: string;
  items: Array<{ title: string; detail: string }>;
};

function SectionCard({ heading, items }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-[var(--text)]">{heading}</h2>
      </header>
      <ul className="space-y-3 text-sm text-slate-200">
        {items.map((item) => (
          <li key={item.title} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="font-semibold text-[var(--text)]">{item.title}</p>
            <p className="text-xs text-slate-300">{item.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
