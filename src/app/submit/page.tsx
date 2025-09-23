import PageHeader from '@/components/shell/page-header';
import SubmissionForm from '@/components/forms/submission-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function SubmitPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Share your work" />
      <SubmissionForm />
    </div>
  );
}
