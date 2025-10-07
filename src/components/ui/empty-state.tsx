import Link from 'next/link';
import { ReactNode } from 'react';

interface EmptyStateProps {
  variant: 'submissions' | 'published' | 'search' | 'editor' | 'committee' | 'error';
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  icon?: ReactNode;
}

const defaultIcons = {
  submissions: (
    <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  published: (
    <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
  search: (
    <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  editor: (
    <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
      />
    </svg>
  ),
  committee: (
    <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  ),
  error: (
    <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
};

const variantStyles = {
  submissions: {
    container: 'border-blue-500/20 bg-blue-500/5',
    icon: 'text-blue-400',
    title: 'text-blue-100',
    description: 'text-blue-200/70',
    button: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondaryButton: 'border-blue-500/30 text-blue-200 hover:bg-blue-500/10',
  },
  published: {
    container: 'border-purple-500/20 bg-purple-500/5',
    icon: 'text-purple-400',
    title: 'text-purple-100',
    description: 'text-purple-200/70',
    button: 'bg-purple-600 hover:bg-purple-700 text-white',
    secondaryButton: 'border-purple-500/30 text-purple-200 hover:bg-purple-500/10',
  },
  search: {
    container: 'border-amber-500/20 bg-amber-500/5',
    icon: 'text-amber-400',
    title: 'text-amber-100',
    description: 'text-amber-200/70',
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
    secondaryButton: 'border-amber-500/30 text-amber-200 hover:bg-amber-500/10',
  },
  editor: {
    container: 'border-green-500/20 bg-green-500/5',
    icon: 'text-green-400',
    title: 'text-green-100',
    description: 'text-green-200/70',
    button: 'bg-green-600 hover:bg-green-700 text-white',
    secondaryButton: 'border-green-500/30 text-green-200 hover:bg-green-500/10',
  },
  committee: {
    container: 'border-indigo-500/20 bg-indigo-500/5',
    icon: 'text-indigo-400',
    title: 'text-indigo-100',
    description: 'text-indigo-200/70',
    button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    secondaryButton: 'border-indigo-500/30 text-indigo-200 hover:bg-indigo-500/10',
  },
  error: {
    container: 'border-red-500/20 bg-red-500/5',
    icon: 'text-red-400',
    title: 'text-red-100',
    description: 'text-red-200/70',
    button: 'bg-red-600 hover:bg-red-700 text-white',
    secondaryButton: 'border-red-500/30 text-red-200 hover:bg-red-500/10',
  },
};

export function EmptyState({
  variant,
  title,
  description,
  action,
  secondaryAction,
  icon,
}: EmptyStateProps) {
  const styles = variantStyles[variant];
  const displayIcon = icon || defaultIcons[variant];

  return (
    <div
      className={`rounded-2xl border ${styles.container} p-12 text-center transition-all duration-300 hover:scale-[1.01]`}
    >
      <div className={`mx-auto mb-6 ${styles.icon}`}>{displayIcon}</div>
      
      <h3 className={`mb-3 text-xl font-semibold ${styles.title}`}>{title}</h3>
      
      <p className={`mx-auto mb-8 max-w-md text-sm ${styles.description}`}>{description}</p>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <>
              {action.href ? (
                <Link
                  href={action.href}
                  className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all ${styles.button}`}
                >
                  {action.label}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
              ) : (
                <button
                  onClick={action.onClick}
                  className={`inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium transition-all ${styles.button}`}
                >
                  {action.label}
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </button>
              )}
            </>
          )}

          {secondaryAction && (
            <>
              {secondaryAction.href ? (
                <Link
                  href={secondaryAction.href}
                  className={`inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium transition-all ${styles.secondaryButton}`}
                >
                  {secondaryAction.label}
                </Link>
              ) : (
                <button
                  onClick={secondaryAction.onClick}
                  className={`inline-flex items-center gap-2 rounded-lg border px-6 py-3 text-sm font-medium transition-all ${styles.secondaryButton}`}
                >
                  {secondaryAction.label}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
