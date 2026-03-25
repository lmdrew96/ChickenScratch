import { ReactNode } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { BackButton } from '@/components/navigation/back-button';

type PageHeaderProps = {
  title: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
  action?: ReactNode;
  showBreadcrumbs?: boolean;
  showBackButton?: boolean;
  backButtonHref?: string;
  backButtonLabel?: string;
  breadcrumbItems?: Array<{ label: string; href: string }>;
};

export function PageHeader({
  title,
  description,
  ctaHref,
  ctaLabel,
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
      <div className="page-header-content flex flex-wrap items-center justify-between gap-4">
        <div className="page-header-text space-y-1">
          {showBackButton && (
            <div style={{ marginBottom: '0.75rem' }}>
              <BackButton href={backButtonHref} label={backButtonLabel} />
            </div>
          )}
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
          {description && <p className="text-sm text-slate-300">{description}</p>}
        </div>
        {(ctaHref && ctaLabel) ? (
          <Link href={ctaHref} className="btn btn-accent">
            {ctaLabel}
          </Link>
        ) : action ? (
          <div className="page-header-action">{action}</div>
        ) : null}
      </div>
    </div>
  );
}

export default PageHeader;
