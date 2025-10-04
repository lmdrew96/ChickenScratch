import SubmissionForm from '@/components/forms/submission-form';
import { PageHeader } from '@/components/navigation';
import { requireUser } from '@/lib/auth/guards';

export default async function SubmitPage() {
  await requireUser('/submit');

  return (
    <div className="space-y-8">
      <PageHeader 
        title="Submit your work" 
        description="Share your creative writing with the Hen & Ink community"
      />
      <div className="mx-auto max-w-3xl pl-0 pr-0">
        <SubmissionForm />
      </div>
    </div>
  );
}
