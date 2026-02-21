import './globals.css'
import { ClerkProvider } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'
import { eq } from 'drizzle-orm'
import AccountBadge from '@/components/account-badge';
import Sidebar from '@/components/shell/sidebar'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { SkipLinks } from '@/components/accessibility';
import { ToastProvider } from '@/components/ui/toast'
import { SiteFooter } from '@/components/layout/site-footer'
import { ensureProfile } from '@/lib/auth/clerk'
import { db } from '@/lib/db'
import { userRoles } from '@/lib/db/schema'
import { hasOfficerAccess, hasCommitteeAccess, hasEditorAccess } from '@/lib/auth/guards'

export const metadata = {
  title: 'Hen & Ink Portal',
  description: 'Submission portal',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth()
  const signedIn = !!userId

  // Fetch user profile for account badge and role-gated nav
  let userProfile: { avatarUrl: string | null; initials: string } | null = null;
  let navAccess = { officer: false, committee: false, editor: false };
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

    // Fetch user roles to determine nav visibility
    if (profile) {
      try {
        const roleRows = await db()
          .select()
          .from(userRoles)
          .where(eq(userRoles.user_id, profile.id))
          .limit(1);
        const role = roleRows[0];
        if (role?.is_member) {
          navAccess = {
            officer: hasOfficerAccess(role.positions as string[] | null, role.roles as string[] | null),
            committee: hasCommitteeAccess(role.positions as string[] | null, role.roles as string[] | null),
            editor: hasEditorAccess(role.positions as string[] | null, role.roles as string[] | null),
          };
        }
      } catch {
        // Silently fall back to hiding privileged nav links
      }
    }
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
                <Sidebar signedIn={signedIn} userProfile={userProfile} navAccess={navAccess} />
                <main id="main-content" className="main" role="main" aria-label="Main content">
                  <div className="container">{children}</div>
                  <SiteFooter />
                </main>
              </div>
            </ErrorBoundary>
          </ToastProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
