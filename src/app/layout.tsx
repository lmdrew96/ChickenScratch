import './globals.css';
import type { Metadata } from 'next';
import Providers from './providers';
import Sidebar from '@/components/shell/sidebar';

export const metadata: Metadata = {
  title: 'Chicken Scratch Zine Portal',
  description: 'Submissions & publishing portal for Chicken Scratch',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <Sidebar />
          {/* Reserve space for the fixed sidebar on large screens */}
          <div className="min-h-screen lg:ml-[18rem] content-shell">
            <main className="container py-8">{children}</main>
            <footer className="container py-12 border-t border-white/10 text-sm text-slate-400">
              Chicken Scratch is a student-run zine for the UD and DTCC community.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
