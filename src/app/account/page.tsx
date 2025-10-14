import { redirect } from 'next/navigation';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';
import { PageHeader } from '@/components/navigation';
import AccountEditor from '@/components/account/account-editor';

export const metadata = { title: 'Your account' };

export default async function AccountPage() {
  const supabase = await createSupabaseServerReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/account');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, pronouns')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.from('profiles').upsert({ id: user.id });
  }

  const fullName = profile?.full_name ?? user.user_metadata?.full_name ?? null;
  const avatarUrl = profile?.avatar_url ?? null;
  const pronouns = profile?.pronouns ?? null;

  return (
    <>
      <PageHeader 
        title="Your account" 
        description="Manage your profile and account settings"
        showBackButton={true}
      />
      <div className="container">
        <AccountEditor
          userId={user.id}
          defaultName={fullName}
          defaultAvatar={avatarUrl}
          defaultPronouns={pronouns}
        />
      </div>
    </>
  );
}
