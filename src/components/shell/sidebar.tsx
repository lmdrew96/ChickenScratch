'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()
  const is = (href: string) => pathname === href
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge" />
        <div className="font-semibold">Hen &amp; Ink</div>
      </div>
      <nav className="nav">
        <Link href="/" className={is('/') ? 'active' : ''}>Home</Link>
        <Link href="/submit" className={is('/submit') ? 'active' : ''}>Submit</Link>
        <Link href="/mine" className={is('/mine') ? 'active' : ''}>My Submissions</Link>
        <Link href="/published" className={is('/published') ? 'active' : ''}>Published</Link>
        <Link href="/editor" className={is('/editor') ? 'active' : ''}>Editor</Link>
        <Link href="/committee" className={is('/committee') ? 'active' : ''}>Committee</Link>
      </nav>
      <div style={{ marginTop: 'auto' }}>
        <Link href="/login" className="btn btn-accent" style={{ display: 'inline-flex', marginTop: '1rem' }}>
          Login
        </Link>
      </div>
    </aside>
  )
}
