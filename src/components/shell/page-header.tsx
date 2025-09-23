'use client';

type Props = { title: string; ctaHref?: string; ctaLabel?: string };

export default function PageHeader({ title, ctaHref, ctaLabel }: Props) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <h1>{title}</h1>
      </div>
      {ctaHref && ctaLabel ? (
        <a href={ctaHref} className="btn btn-accent hidden sm:inline-flex">
          {ctaLabel}
        </a>
      ) : null}
    </div>
  );
}
