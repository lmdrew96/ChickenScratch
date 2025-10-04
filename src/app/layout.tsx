import './globals.css'
import AccountBadge from '@/components/account-badge';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly'
import Sidebar from '@/components/shell/sidebar'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { SkipLinks } from '@/components/accessibility'

export const metadata = { 
  title: 'Hen & Ink Portal', 
  description: 'Submission portal',
  viewport: 'width=device-width, initial-scale=1'
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerReadOnlyClient()
  const { data: { user } } = await supabase.auth.getUser()
  const signedIn = !!user

  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <SkipLinks />
          <AccountBadge />
          <div className="app-shell">
            <Sidebar signedIn={signedIn} />
            <main id="main-content" className="main" role="main" aria-label="Main content">
              <div className="container">{children}</div>
            </main>
          </div>
        </ErrorBoundary>
      </body>
    </html>
  )
}
