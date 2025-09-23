import SubmissionForm from '@/components/forms/submission-form';
import PageHeader from '@/components/shell/page-header';
import { requireUser } from '@/lib/auth/guards';

export default async function SubmitPage() {
  await requireUser('/submit');

  return (
    <div className="space-y-8">
      <PageHeader title="Submit your work" />
      <div className="mx-auto max-w-3xl pl-0 pr-0">
        <SubmissionForm />
      </div>
    </div>
  );
}
