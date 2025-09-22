'use client';

import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' && 'bg-amber-400 px-4 py-2 text-slate-950 hover:bg-amber-300',
        variant === 'outline' &&
          'border border-white/30 bg-transparent px-4 py-2 text-white hover:border-white/50 hover:bg-white/10',
        variant === 'ghost' && 'px-3 py-1 text-sm text-white/80 hover:text-white hover:underline',
        size === 'sm' && 'px-3 py-1 text-sm',
        size === 'md' && 'px-4 py-2 text-sm',
        className
      )}
      {...props}
    />
  );
});
