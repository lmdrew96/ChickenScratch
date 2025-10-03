'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

export default function Sidebar({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname()
  const is = (href: string) => pathname === href
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }
  
  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }
  
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo.png" alt="Hen & Ink logo" className="brand-badge" />
        <div className="font-semibold">Hen &amp; Ink</div>
      </div>
      
      {/* Hamburger menu button - only visible on mobile */}
      <button
        type="button"
        className="mobile-menu-toggle"
        onClick={toggleMobileMenu}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileMenuOpen}
        style={{ display: 'none' }}
      >
        {mobileMenuOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>
      
      <nav className={`nav ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        <Link href="/" className={is('/') ? 'active' : ''} onClick={closeMobileMenu}>Home</Link>
        <Link href="/submit" className={is('/submit') ? 'active' : ''} onClick={closeMobileMenu}>Submit</Link>
        <Link href="/mine" className={is('/mine') ? 'active' : ''} onClick={closeMobileMenu}>My Submissions</Link>
        <Link href="/published" className={is('/published') ? 'active' : ''} onClick={closeMobileMenu}>Published</Link>
        <Link href="/officers" className={is('/officers') ? 'active' : ''} onClick={closeMobileMenu}>Officers</Link>
        <Link href="/committee" className={is('/committee') ? 'active' : ''} onClick={closeMobileMenu}>Committee</Link>
        <Link href="/editor" className={is('/editor') ? 'active' : ''} onClick={closeMobileMenu}>Editor</Link>
      </nav>
      
      <div className="sidebar-auth">
        {signedIn ? (
          <form action="/api/auth/signout" method="post" className="auth-form">
            <button type="submit" className="btn" aria-label="Sign out">Sign out</button>
          </form>
        ) : (
          <Link href="/login" className="btn btn-accent">
            Login
          </Link>
        )}
      </div>
      
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-menu-toggle {
            display: flex !important;
          }
        }
      `}</style>
    </aside>
  )
}
