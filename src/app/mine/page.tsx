export const revalidate = 0;
export const dynamic = 'force-dynamic';
import { MineClient } from '@/components/mine/mine-client';
import { requireProfile } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Submission } from '@/types/database';
import PageHeader from '@/components/shell/page-header';

export default async function MinePage() {
  const { profile } = await requireProfile();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from('submissions')
    .select('*, assigned_editor_profile:profiles!submissions_assigned_editor_fkey(name,email)')
    .eq('owner_id', profile.id)
    .order('created_at', { ascending: false });

  const rawSubmissions = (data ?? []) as unknown as MineSubmissionRow[];
  const submissions: MineSubmission[] = rawSubmissions.map((submission) => ({
    ...submission,
    art_files: Array.isArray(submission.art_files) ? (submission.art_files as string[]) : [],
  }));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <PageHeader title="My Submissions" ctaHref="/submit" ctaLabel="Submit new" />
        <p className="text-sm text-white/70">
          Track your pieces, upload revisions, and see editorial notes. You can edit while the status is Submitted or
          Needs Revision.
        </p>
      </header>
      <MineClient submissions={submissions} viewerName={profile.name ?? profile.email ?? 'student'} />
    </div>
  );
}

type MineSubmission = Submission & {
  art_files: string[];
  assigned_editor_profile: { name: string | null; email: string | null } | null;
};

type MineSubmissionRow = Submission & {
  art_files: Submission['art_files'];
  assigned_editor_profile: { name: string | null; email: string | null } | null;
};
