import Link from 'next/link';

type PageHeaderProps = {
  title: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export function PageHeader({ title, description, ctaHref, ctaLabel }: PageHeaderProps) {
  return (
    <div className="page-header flex flex-wrap items-center justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
        {description ? <p className="text-sm text-slate-300">{description}</p> : null}
      </div>
      {ctaHref && ctaLabel ? (
        <Link href={ctaHref} className="btn btn-accent">
          {ctaLabel}
        </Link>
      ) : null}
    </div>
  );
}

export default PageHeader;
