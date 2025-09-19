import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/forms/login-form';
import { getSessionWithProfile, roleLandingPath } from '@/lib/auth';
import { getAllowedDomains } from '@/lib/env';

export default async function LoginPage() {
  const { profile } = await getSessionWithProfile();
  if (profile) {
    redirect(roleLandingPath(profile.role));
  }

  const allowedDomains = getAllowedDomains();

  return (
    <div className="mx-auto mt-12 max-w-4xl px-4 sm:px-6 lg:px-8">
      <LoginForm allowedDomains={allowedDomains} />
    </div>
  );
}
