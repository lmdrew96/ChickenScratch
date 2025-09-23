import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { getSessionWithProfile } from '@/lib/auth';

import './globals.css';

export const metadata: Metadata = {
  title: 'Chicken Scratch Zine Portal',
  description: 'Submit, review, and publish work for Chicken Scratch.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { profile } = await getSessionWithProfile();

  return (
    <html lang="en">
      <body$1 className="bg-[--bg] text-[--text]">
        <style
          id="brand-inline-theme"
          dangerouslySetInnerHTML={{
            __html: ":root{--brand:#00539f;--accent:#ffd200;--bg:#0b1220;--text:#e5e7eb} body{background:var(--bg);color:var(--text)} a{color:#cbd5e1}"
          }}
        />

      
        <Providers>
          <div className="flex min-h-screen flex-col">
            <SiteHeader profile={profile} />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 lg:px-8">
              {children}
            </main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
