import './globals.css'
import Sidebar from '@/components/shell/sidebar'

export const metadata = { title: 'Hen & Ink Portal', description: 'Submission portal' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="main">
            <div className="container">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}
