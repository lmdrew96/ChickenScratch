'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  showHome?: boolean
}

// Route label mapping for better display names
const routeLabels: Record<string, string> = {
  '': 'Home',
  'submit': 'Submit Work',
  'mine': 'My Submissions',
  'published': 'Published Works',
  'officers': 'Officers',
  'committee': 'Committee Dashboard',
  'editor': 'Editorial Dashboard',
  'account': 'Account Settings',
  'login': 'Login',
  'signup': 'Sign Up',
}

export function Breadcrumbs({ items, showHome = true }: BreadcrumbsProps) {
  const pathname = usePathname()
  
  // Generate breadcrumbs from pathname if items not provided
  const breadcrumbItems = items || generateBreadcrumbs(pathname)
  
  if (breadcrumbItems.length === 0) {
    return null
  }

  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      <ol className="breadcrumb-list">
        {showHome && (
          <>
            <li className="breadcrumb-item">
              <Link href="/" className="breadcrumb-link" aria-label="Home">
                <Home size={14} />
              </Link>
            </li>
            {breadcrumbItems.length > 0 && (
              <li className="breadcrumb-separator" aria-hidden="true">
                <ChevronRight size={14} />
              </li>
            )}
          </>
        )}
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1
          return (
            <li key={item.href} className="breadcrumb-item">
              {isLast ? (
                <span className="breadcrumb-current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <>
                  <Link href={item.href} className="breadcrumb-link">
                    {item.label}
                  </Link>
                  <span className="breadcrumb-separator" aria-hidden="true">
                    <ChevronRight size={14} />
                  </span>
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  // Remove leading/trailing slashes and split
  const segments = pathname.replace(/^\/|\/$/g, '').split('/').filter(Boolean)
  
  if (segments.length === 0) {
    return []
  }

  const breadcrumbs: BreadcrumbItem[] = []
  let currentPath = ''

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    
    // Get label from mapping or format the segment
    const label = routeLabels[segment] || formatSegment(segment)
    
    breadcrumbs.push({
      label,
      href: currentPath,
    })
  })

  return breadcrumbs
}

function formatSegment(segment: string): string {
  // Convert kebab-case or snake_case to Title Case
  return segment
    .replace(/[-_]/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
