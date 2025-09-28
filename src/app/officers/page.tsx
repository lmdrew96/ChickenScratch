import PageHeader from '@/components/shell/page-header';
import { requireOfficerRole } from '@/lib/auth/guards';

const meetingScheduler = [
  { title: 'Next meeting proposal', meta: 'Vote to schedule for next Friday' },
  { title: 'Agenda items', meta: '3 topics submitted' },
  { title: 'Meeting history', meta: 'Last met: January 15th' },
];

const officerTasks = [
  { title: 'Budget review', meta: 'Q1 financial report due' },
  { title: 'Event planning', meta: 'Spring showcase coordination' },
  { title: 'Committee oversight', meta: 'Review workflow efficiency' },
];

const adminTools = [
  { title: 'User role management', meta: 'Assign new committee members' },
  { title: 'System settings', meta: 'Configure workflow parameters' },
  { title: 'Analytics dashboard', meta: 'View submission metrics' },
];

export default async function OfficersPage() {
  const { profile } = await requireOfficerRole('/officers');

  const roleDisplayNames = {
    bbeg: 'BBEG',
    dictator_in_chief: 'Dictator-in-Chief', 
    scroll_gremlin: 'Scroll Gremlin',
    chief_hoarder: 'Chief Hoarder',
    pr_nightmare: 'PR Nightmare'
  };

  const displayRole = roleDisplayNames[profile.role as keyof typeof roleDisplayNames] || profile.role;

  return (
    <div className="space-y-6">
      <PageHeader title="Officers Dashboard" />
      
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg md:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-[var(--text)]">Welcome, {displayRole}</h2>
          <p className="text-sm text-slate-300">Officer access granted - manage team operations</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard heading="Team Meeting Scheduler" items={meetingScheduler} />
        <SectionCard heading="Officer Tasks" items={officerTasks} />
        <SectionCard heading="Admin Tools" items={adminTools} />
      </div>
    </div>
  );
}

type SectionCardProps = {
  heading: string;
  items: Array<{ title: string; meta: string }>;
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
            <p className="text-xs text-slate-300">{item.meta}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}