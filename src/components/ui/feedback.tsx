'use client';

import { clsx } from 'clsx';
import { LoadingSpinner } from '@/components/shared/loading-states';

// Error Message Component with Recovery Actions
interface ErrorMessageProps {
  title?: string;
  message: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  className?: string;
  onDismiss?: () => void;
}

export function ErrorMessage({
  title = 'Something went wrong',
  message,
  actions,
  className = '',
  onDismiss
}: ErrorMessageProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-red-500/30 bg-red-500/10 p-4',
        className
      )}
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-red-300">{title}</h3>
            <p className="mt-1 text-sm text-red-200">{message}</p>
          </div>
          
          {actions && actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={clsx(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition',
                    action.variant === 'primary'
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-red-500/20 text-red-200 hover:bg-red-500/30'
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 rounded p-1 text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
            aria-label="Dismiss error"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Success Message Component
interface SuccessMessageProps {
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  onDismiss?: () => void;
}

export function SuccessMessage({
  title = 'Success',
  message,
  action,
  className = '',
  onDismiss
}: SuccessMessageProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        
        <div className="flex-1 space-y-2">
          <div>
            <h3 className="text-sm font-semibold text-emerald-300">{title}</h3>
            <p className="mt-1 text-sm text-emerald-200">{message}</p>
          </div>
          
          {action && (
            <button
              onClick={action.onClick}
              className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/30"
            >
              {action.label}
            </button>
          )}
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 rounded p-1 text-emerald-300 transition hover:bg-emerald-500/20 hover:text-emerald-200"
            aria-label="Dismiss success message"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// Loading Overlay Component
interface LoadingOverlayProps {
  message?: string;
  progress?: number;
  className?: string;
}

export function LoadingOverlay({
  message = 'Loading...',
  progress,
  className = ''
}: LoadingOverlayProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-4 rounded-xl border border-white/10 bg-white/5 p-8',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size="lg" />
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-slate-200">{message}</p>
        {progress !== undefined && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Inline Loading State
interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function InlineLoading({
  message = 'Loading...',
  size = 'sm',
  className = ''
}: InlineLoadingProps) {
  return (
    <div
      className={clsx('flex items-center gap-2', className)}
      role="status"
      aria-live="polite"
    >
      <LoadingSpinner size={size} />
      <span className={clsx('text-slate-400', size === 'sm' ? 'text-xs' : 'text-sm')}>
        {message}
      </span>
    </div>
  );
}

// Form Field Error
interface FieldErrorProps {
  error?: string;
  className?: string;
}

export function FieldError({ error, className = '' }: FieldErrorProps) {
  if (!error) return null;
  
  return (
    <p
      className={clsx('text-sm text-red-400', className)}
      role="alert"
      aria-live="assertive"
    >
      {error}
    </p>
  );
}

// Info Message Component
interface InfoMessageProps {
  title?: string;
  message: string;
  icon?: 'info' | 'warning';
  className?: string;
  onDismiss?: () => void;
}

export function InfoMessage({
  title,
  message,
  icon = 'info',
  className = '',
  onDismiss
}: InfoMessageProps) {
  const isWarning = icon === 'warning';
  
  return (
    <div
      className={clsx(
        'rounded-xl border p-4',
        isWarning
          ? 'border-amber-500/30 bg-amber-500/10'
          : 'border-sky-500/30 bg-sky-500/10',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {isWarning ? (
            <svg
              className="h-5 w-5 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          ) : (
            <svg
              className="h-5 w-5 text-sky-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>
        
        <div className="flex-1">
          {title && (
            <h3
              className={clsx(
                'text-sm font-semibold',
                isWarning ? 'text-amber-300' : 'text-sky-300'
              )}
            >
              {title}
            </h3>
          )}
          <p
            className={clsx(
              'text-sm',
              title ? 'mt-1' : '',
              isWarning ? 'text-amber-200' : 'text-sky-200'
            )}
          >
            {message}
          </p>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={clsx(
              'flex-shrink-0 rounded p-1 transition',
              isWarning
                ? 'text-amber-300 hover:bg-amber-500/20 hover:text-amber-200'
                : 'text-sky-300 hover:bg-sky-500/20 hover:text-sky-200'
            )}
            aria-label="Dismiss message"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
