'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { SignOutButton } from '@clerk/nextjs'
import { ChevronRight } from 'lucide-react'

interface SidebarProps {
  signedIn?: boolean;
  userProfile?: { avatarUrl: string | null; initials: string } | null;
  navAccess?: { officer: boolean; committee: boolean; editor: boolean };
}

function getInitialOpenSections(pathname: string): Set<string> {
  const open = new Set<string>()
  if (['/published', '/issues'].some(p => pathname === p || pathname.startsWith(p + '/'))) open.add('zine')
  if (['/exhibition'].some(p => pathname === p || pathname.startsWith(p + '/'))) open.add('community')
  if (['/submit', '/mine'].some(p => pathname === p || pathname.startsWith(p + '/'))) open.add('mywork')
  if (['/about', '/contact'].some(p => pathname === p || pathname.startsWith(p + '/'))) open.add('info')
  if (['/officers', '/committee', '/editor'].some(p => pathname === p || pathname.startsWith(p + '/'))) open.add('staff')
  return open
}

export default function Sidebar({ signedIn = false, userProfile, navAccess }: SidebarProps) {
  const pathname = usePathname()
  const is = (href: string) => pathname === href || pathname.startsWith(href + '/')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(
    () => getInitialOpenSections(pathname)
  )
  const navRef = useRef<HTMLElement>(null)

  const toggleMobileMenu = () => setMobileMenuOpen(prev => !prev)
  const closeMobileMenu = () => setMobileMenuOpen(false)

  const toggleSection = (key: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const hasStaffAccess = navAccess?.officer || navAccess?.committee || navAccess?.editor

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) setMobileMenuOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileMenuOpen])

  // Keyboard navigation for nav items (links + section toggles)
  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const items = Array.from(
        nav.querySelectorAll('a, button[data-nav-toggle]')
      ) as (HTMLAnchorElement | HTMLButtonElement)[]
      const currentIndex = items.findIndex(el => el === document.activeElement)

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        items[(currentIndex + 1) % items.length]?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        items[currentIndex <= 0 ? items.length - 1 : currentIndex - 1]?.focus()
      } else if (e.key === 'Home') {
        e.preventDefault()
        items[0]?.focus()
      } else if (e.key === 'End') {
        e.preventDefault()
        items[items.length - 1]?.focus()
      }
    }

    nav.addEventListener('keydown', handleKeyDown)
    return () => nav.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <aside className="sidebar">
      <div className="brand">
        <Image src="/logo.png" alt="Hen & Ink logo" width={40} height={40} className="brand-badge" />
        <div className="font-guavine font-semibold text-2xl">Hen &amp; Ink</div>
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

      <div className="sidebar-auth mb-2">
        {signedIn ? (
          <>
            {/* Inline account badge for mobile - hidden on desktop via CSS */}
            {userProfile && (
              <Link
                href="/account"
                aria-label="Your account"
                className="account-badge-inline"
                prefetch={false}
              >
                {userProfile.avatarUrl ? (
                  <Image
                    src={userProfile.avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded-full"
                    unoptimized
                  />
                ) : (
                  <span>{userProfile.initials}</span>
                )}
              </Link>
            )}
            {/* Sign out only shown on mobile — desktop uses the account badge dropdown */}
            <div className="md:hidden">
              <SignOutButton redirectUrl="/login">
                <button type="button" className="btn" aria-label="Sign out">Sign out</button>
              </SignOutButton>
            </div>
          </>
        ) : (
          <Link href="/login" className="btn btn-accent w-full justify-center">
            Login
          </Link>
        )}
      </div>

      <nav
        id="navigation"
        ref={navRef}
        className={`nav ${mobileMenuOpen ? 'mobile-open' : ''}`}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Home — always ungrouped */}
        <Link
          href="/"
          className={is('/') ? 'active' : ''}
          onClick={closeMobileMenu}
          aria-current={is('/') ? 'page' : undefined}
        >
          Home
        </Link>

        {/* ── Zine ── */}
        <div>
          <button
            type="button"
            data-nav-toggle
            onClick={() => toggleSection('zine')}
            aria-expanded={openSections.has('zine')}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/50 transition-colors hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <span>Zine</span>
            <ChevronRight
              className="h-3 w-3 transition-transform duration-150"
              style={{ transform: openSections.has('zine') ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
          </button>
          {openSections.has('zine') && (
            <div className="mt-0.5 grid gap-0.5 pl-2">
              <Link
                href="/published"
                className={is('/published') ? 'active' : ''}
                onClick={closeMobileMenu}
                aria-current={is('/published') ? 'page' : undefined}
              >
                Published
              </Link>
              <Link
                href="/issues"
                className={is('/issues') ? 'active' : ''}
                onClick={closeMobileMenu}
                aria-current={is('/issues') ? 'page' : undefined}
              >
                Issues
              </Link>
            </div>
          )}
        </div>

        {/* ── My Work ── */}
        <div>
          <button
            type="button"
            data-nav-toggle
            onClick={() => toggleSection('mywork')}
            aria-expanded={openSections.has('mywork')}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/50 transition-colors hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <span>My Work</span>
            <ChevronRight
              className="h-3 w-3 transition-transform duration-150"
              style={{ transform: openSections.has('mywork') ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
          </button>
          {openSections.has('mywork') && (
            <div className="mt-0.5 grid gap-0.5 pl-2">
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
            </div>
          )}
        </div>

        {/* ── Community ── */}
        <div>
          <button
            type="button"
            data-nav-toggle
            onClick={() => toggleSection('community')}
            aria-expanded={openSections.has('community')}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/50 transition-colors hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <span>Community</span>
            <ChevronRight
              className="h-3 w-3 transition-transform duration-150"
              style={{ transform: openSections.has('community') ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
          </button>
          {openSections.has('community') && (
            <div className="mt-0.5 grid gap-0.5 pl-2">
              <Link
                href="/exhibition"
                className={is('/exhibition') ? 'active' : ''}
                onClick={closeMobileMenu}
                aria-current={is('/exhibition') ? 'page' : undefined}
              >
                Exhibition
              </Link>
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div>
          <button
            type="button"
            data-nav-toggle
            onClick={() => toggleSection('info')}
            aria-expanded={openSections.has('info')}
            className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/50 transition-colors hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            <span>Info</span>
            <ChevronRight
              className="h-3 w-3 transition-transform duration-150"
              style={{ transform: openSections.has('info') ? 'rotate(90deg)' : 'rotate(0deg)' }}
            />
          </button>
          {openSections.has('info') && (
            <div className="mt-0.5 grid gap-0.5 pl-2">
              <Link
                href="/about"
                className={is('/about') ? 'active' : ''}
                onClick={closeMobileMenu}
                aria-current={is('/about') ? 'page' : undefined}
              >
                About
              </Link>
              <Link
                href="/contact"
                className={is('/contact') ? 'active' : ''}
                onClick={closeMobileMenu}
                aria-current={is('/contact') ? 'page' : undefined}
              >
                Contact
              </Link>
            </div>
          )}
        </div>

        {/* ── Staff (role-gated) ── */}
        {hasStaffAccess && (
          <div>
            <button
              type="button"
              data-nav-toggle
              onClick={() => toggleSection('staff')}
              aria-expanded={openSections.has('staff')}
              className="flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/50 transition-colors hover:text-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <span>Staff</span>
              <ChevronRight
                className="h-3 w-3 transition-transform duration-150"
                style={{ transform: openSections.has('staff') ? 'rotate(90deg)' : 'rotate(0deg)' }}
              />
            </button>
            {openSections.has('staff') && (
              <div className="mt-0.5 grid gap-0.5 pl-2">
                {navAccess?.officer && (
                  <Link
                    href="/officers"
                    className={is('/officers') ? 'active' : ''}
                    onClick={closeMobileMenu}
                    aria-current={is('/officers') ? 'page' : undefined}
                  >
                    Officers
                  </Link>
                )}
                {(navAccess?.officer || navAccess?.committee) && (
                  <>
                    <Link
                      href="/committee"
                      className={pathname === '/committee' ? 'active' : ''}
                      onClick={closeMobileMenu}
                      aria-current={pathname === '/committee' ? 'page' : undefined}
                    >
                      Committee
                    </Link>
                    <Link
                      href="/committee/zine-issues"
                      className={is('/committee/zine-issues') ? 'active' : ''}
                      onClick={closeMobileMenu}
                      aria-current={is('/committee/zine-issues') ? 'page' : undefined}
                    >
                      Zine Issues
                    </Link>
                  </>
                )}
                {(navAccess?.officer || navAccess?.editor) && (
                  <Link
                    href="/editor"
                    className={is('/editor') ? 'active' : ''}
                    onClick={closeMobileMenu}
                    aria-current={is('/editor') ? 'page' : undefined}
                  >
                    Editor
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </nav>

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
