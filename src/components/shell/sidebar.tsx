'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname()
  const is = (href: string) => pathname === href
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo.png" alt="Hen & Ink logo" className="brand-badge" />
        <div className="font-semibold">Hen &amp; Ink</div>
      </div>
      <nav className="nav">
        <Link href="/" className={is('/') ? 'active' : ''}>Home</Link>
        <Link href="/submit" className={is('/submit') ? 'active' : ''}>Submit</Link>
        <Link href="/mine" className={is('/mine') ? 'active' : ''}>My Submissions</Link>
        <Link href="/published" className={is('/published') ? 'active' : ''}>Published</Link>
        <Link href="/officers" className={is('/officers') ? 'active' : ''}>Officers</Link>
        <Link href="/committee" className={is('/committee') ? 'active' : ''}>Committee</Link>
        <Link href="/editor" className={is('/editor') ? 'active' : ''}>Editor</Link>
      </nav>
      <div style={{ marginTop: 'auto' }}>
        {signedIn ? (
          <form action="/api/auth/signout" method="post" style={{ display: 'inline-block', marginTop: '1rem' }}>
            <button type="submit" className="btn" aria-label="Sign out">Sign out</button>
          </form>
        ) : (
          <a href="/login" className="btn btn-accent" style={{ display: 'inline-flex', marginTop: '1rem' }}>
            Login
          </a>
        )}
      </div>
    </aside>
  )
}
