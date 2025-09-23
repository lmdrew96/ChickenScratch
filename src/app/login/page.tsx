import PageHeader from '@/components/shell/page-header';
import LoginForm from '@/components/forms/login-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Login' };
export const dynamic = 'force-dynamic';

const allowedDomains =
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAINS?.split(',')
    .map(s => s.trim())
    .filter(Boolean) ?? [];

export default function LoginPage() {
  return (
    <>
      <PageHeader title="Login" />
      <div className="mx-auto mt-12 max-w-4xl px-4 sm:px-6 lg:px-8">
        <LoginForm allowedDomains={allowedDomains} />
      </div>
    </>
  );
}
