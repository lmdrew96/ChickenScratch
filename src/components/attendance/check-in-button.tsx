'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { checkIn } from '@/lib/actions/group-attendance';

type Props = {
  monthlyCount: number;
  monthName: string;
};

export function CheckInButton({ monthlyCount, monthName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justChecked, setJustChecked] = useState(false);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      const result = await checkIn();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setJustChecked(true);
      router.refresh();
    });
  };

  if (justChecked) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <CheckCircle2
          className="h-20 w-20 text-emerald-300"
          strokeWidth={1.5}
          aria-hidden
        />
        <p className="text-xl font-semibold text-white">You&apos;re checked in!</p>
        <p className="text-sm text-white/70">
          {monthlyCount + 1} of 3 group meetings this {monthName}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="w-full rounded-xl bg-[var(--accent)] px-6 py-5 text-2xl font-bold text-[#003b72] shadow-lg transition active:scale-[0.98] hover:bg-[#e6bb00] disabled:opacity-70 disabled:cursor-not-allowed min-h-[72px]"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
            Checking in…
          </span>
        ) : (
          'Check In'
        )}
      </button>
      <p className="text-xs text-white/60">
        {monthlyCount} of 3 check-ins this {monthName}
      </p>
      {error && (
        <p className="text-sm text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
