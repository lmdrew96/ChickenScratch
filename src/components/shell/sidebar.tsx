'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export default function Sidebar({ signedIn = false }: { signedIn?: boolean }) {
  const pathname = usePathname()
  const is = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }
  
  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
  }
  
  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false)
      }
    }
    
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen])
  
  // Keyboard navigation for nav items
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    
    const handleKeyDown = (e: KeyboardEvent) => {
      const links = Array.from(nav.querySelectorAll('a')) as HTMLAnchorElement[]
      const currentIndex = links.findIndex(link => link === document.activeElement)
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const nextIndex = (currentIndex + 1) % links.length
        links[nextIndex]?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const prevIndex = currentIndex <= 0 ? links.length - 1 : currentIndex - 1
        links[prevIndex]?.focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        links[0]?.focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        links[links.length - 1]?.focus()
      }
    }
    
    nav.addEventListener('keydown', handleKeyDown)
    return () => nav.removeEventListener('keydown', handleKeyDown)
  }, [])
  
  return (
    <aside className="sidebar">
      <div className="brand">
        <Image src="/logo.png" alt="Hen & Ink logo" width={40} height={40} className="brand-badge" />
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
      
      <nav 
        id="navigation"
        ref={navRef}
        className={`nav ${mobileMenuOpen ? 'mobile-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <Link 
          href="/" 
          className={is('/') ? 'active' : ''} 
          onClick={closeMobileMenu}
          aria-current={is('/') ? 'page' : undefined}
        >
          Home
        </Link>
        <Link 
          href="/submit" 
          className={is('/submit') ? 'active' : ''} 
          onClick={closeMobileMenu}
          aria-current={is('/submit') ? 'page' : undefined}
        >
          Submit
        </Link>
        <Link 
          href="/mine" 
          className={is('/mine') ? 'active' : ''} 
          onClick={closeMobileMenu}
          aria-current={is('/mine') ? 'page' : undefined}
        >
          My Submissions
        </Link>
        <Link 
          href="/published" 
          className={is('/published') ? 'active' : ''} 
          onClick={closeMobileMenu}
          aria-current={is('/published') ? 'page' : undefined}
        >
          Published
        </Link>
        <Link 
          href="/officers" 
          className={is('/officers') ? 'active' : ''} 
          onClick={closeMobileMenu}
          aria-current={is('/officers') ? 'page' : undefined}
        >
          Officers
        </Link>
        <Link 
          href="/committee" 
          className={is('/committee') ? 'active' : ''} 
          onClick={closeMobileMenu}
          aria-current={is('/committee') ? 'page' : undefined}
        >
          Committee
        </Link>
        <Link 
          href="/editor" 
          className={is('/editor') ? 'active' : ''} 
          onClick={closeMobileMenu}
          aria-current={is('/editor') ? 'page' : undefined}
        >
          Editor
        </Link>
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
