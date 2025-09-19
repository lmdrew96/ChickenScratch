'use client';

import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-300/60',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});
