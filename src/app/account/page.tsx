import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { PageHeader } from '@/components/navigation';
import AccountEditor from '@/components/account/account-editor';
import { ensureProfile } from '@/lib/auth/clerk';

export const metadata = { title: 'Your account' };

export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) redirect('/login?next=/account');

  const profile = await ensureProfile(userId);
  if (!profile) redirect('/login?next=/account');

  const fullName = profile.full_name ?? null;
  const avatarUrl = profile.avatar_url ?? null;
  const pronouns = profile.pronouns ?? null;

  return (
    <>
      <PageHeader
        title="Your account"
        description="Manage your profile and account settings"
        showBackButton={true}
      />
      <div className="container space-y-6">
        <AccountEditor
          defaultName={fullName}
          defaultAvatar={avatarUrl}
          defaultPronouns={pronouns}
        />
      </div>
    </>
  );
}
