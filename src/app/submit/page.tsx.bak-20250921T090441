import { SubmissionForm } from '@/components/forms/submission-form';
import { requireProfile } from '@/lib/auth';

export default async function SubmitPage() {
  const { profile } = await requireProfile();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Share your work</h1>
        <p className="max-w-2xl text-sm text-white/70">
          Submit writing or visual art for the next issue of Chicken Scratch. You can edit entries while they are in
          Submitted or Needs Revision state.
        </p>
      </header>
      <SubmissionForm mode="create" redirectTo="/mine" />
      <aside className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
        Signed in as <span className="font-semibold text-white/90">{profile.name ?? profile.email ?? 'student'}</span>.
        Editors will reach out using the contact info in your profile if we need additional details.
      </aside>
    </div>
  );
}
