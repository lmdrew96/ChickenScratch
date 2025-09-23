import './globals.css'
import AccountBadge from '@/components/account-badge';
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly'
import Sidebar from '@/components/shell/sidebar'

export const metadata = { title: 'Hen & Ink Portal', description: 'Submission portal' }

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  
  const supabase = await createSupabaseServerReadOnlyClient()
  const { data: { user } } = await supabase.auth.getUser()
  const signedIn = !!user
return (
    <html lang="en">
      
<body>
      <AccountBadge />

  {/* account badge */}
  

  {/* account badge */}
  

{/* account badge stays as-is if present */}


                {/* account badge stays as-is if present */}

        <div className="app-shell">
          <Sidebar signedIn={signedIn} />
          <main className="main">
            <div className="container">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}
