import { ReactNode } from 'react'
import { Breadcrumbs } from './breadcrumbs'
import { BackButton } from './back-button'

interface PageHeaderProps {
  title: string
  description?: string
  action?: ReactNode
  showBreadcrumbs?: boolean
  showBackButton?: boolean
  backButtonHref?: string
  backButtonLabel?: string
  breadcrumbItems?: Array<{ label: string; href: string }>
}

export function PageHeader({
  title,
  description,
  action,
  showBreadcrumbs = true,
  showBackButton = false,
  backButtonHref,
  backButtonLabel,
  breadcrumbItems,
}: PageHeaderProps) {
  return (
    <div className="page-header">
      {showBreadcrumbs && <Breadcrumbs items={breadcrumbItems} />}
      
      <div className="page-header-content">
        <div className="page-header-text">
          {showBackButton && (
            <div style={{ marginBottom: '0.75rem' }}>
              <BackButton href={backButtonHref} label={backButtonLabel} />
            </div>
          )}
          <h1 className="page-title">{title}</h1>
          {description && <p className="page-description">{description}</p>}
        </div>
        {action && <div className="page-header-action">{action}</div>}
      </div>
    </div>
  )
}
