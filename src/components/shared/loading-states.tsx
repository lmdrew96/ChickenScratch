'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  return (
    <div className={`loading-spinner ${sizeClasses[size]} ${className}`}>
      <svg
        className="animate-spin text-current"
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          className="opacity-25"
        />
        <path
          className="opacity-75"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string;
  height?: string;
}

export function LoadingSkeleton({ 
  className = '', 
  variant = 'rectangular',
  width,
  height 
}: LoadingSkeletonProps) {
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-lg',
    circular: 'rounded-full'
  };

  const style = {
    width,
    height: variant === 'text' ? '1rem' : height
  };

  return (
    <div 
      className={`loading-skeleton animate-pulse bg-white/10 ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

interface LoadingStateProps {
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function LoadingState({ 
  loading, 
  error, 
  children, 
  fallback 
}: LoadingStateProps) {
  if (loading) {
    return (
      <div className="loading-state">
        {fallback || (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-white/70">Loading...</span>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state rounded-xl border border-red-500/20 bg-red-500/10 p-6">
        <h3 className="text-red-400 font-semibold mb-2">Something went wrong</h3>
        <p className="text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  return <>{children}</>;
}