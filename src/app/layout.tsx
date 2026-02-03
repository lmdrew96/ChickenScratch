import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import AccountBadge from '@/components/account-badge';
import Sidebar from '@/components/shell/sidebar'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { SkipLinks } from '@/components/accessibility';
import { ToastProvider } from '@/components/ui/toast'
import { ensureProfile } from '@/lib/auth/clerk'

export const metadata = {
  title: 'Hen & Ink Portal',
  description: 'Submission portal',
  viewport: 'width=device-width, initial-scale=1'
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  const signedIn = !!userId

  // Fetch user profile for account badge in sidebar
  let userProfile: { avatarUrl: string | null; initials: string } | null = null;
  if (userId) {
    const profile = await ensureProfile(userId);
    const fullName = profile?.full_name || 'User';
    const avatarUrl = profile?.avatar_url || null;

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
    <ClerkProvider>
      <html lang="en">
        <body>
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
        </body>
      </html>
    </ClerkProvider>
  )
}
