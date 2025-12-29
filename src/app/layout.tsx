import './globals.css'
import AccountBadge from '@/components/account-badge';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly'
import Sidebar from '@/components/shell/sidebar'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { SkipLinks } from '@/components/accessibility';
import { SupabaseProvider } from '@/components/providers/supabase-provider'
import { ToastProvider } from '@/components/ui/toast'

export const metadata = { 
  title: 'Hen & Ink Portal', 
  description: 'Submission portal',
  viewport: 'width=device-width, initial-scale=1'
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerReadOnlyClient()
  const { data: { user } } = await supabase.auth.getUser()
  const signedIn = !!user

  // Fetch user profile for account badge in sidebar
  let userProfile: { avatarUrl: string | null; initials: string } | null = null;
  if (user) {
    let avatarUrl: string | null = null;
    let fullName = (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email || 'User';
    
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (prof?.avatar_url) avatarUrl = prof.avatar_url;
      if (prof?.full_name) fullName = prof.full_name;
    } catch {}

    const initials = (fullName ?? 'User')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U';

    userProfile = { avatarUrl, initials };
  }

  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          <ToastProvider>
            <ErrorBoundary>
              <SkipLinks />
              <AccountBadge />
              <div className="app-shell">
                <Sidebar signedIn={signedIn} userProfile={userProfile} />
                <main id="main-content" className="main" role="main" aria-label="Main content">
                  <div className="container">{children}</div>
                </main>
              </div>
            </ErrorBoundary>
          </ToastProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
