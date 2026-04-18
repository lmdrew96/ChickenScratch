'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Unlock } from 'lucide-react';

import { useToast } from '@/components/ui/toast';
import { toggleSignupsOpen } from '@/lib/actions/events';

export function SignupsToggle({
  eventId,
  open,
  disabled,
}: {
  eventId: string;
  open: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const { notify } = useToast();
  const [isOpen, setIsOpen] = useState(open);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    const next = !isOpen;
    startTransition(async () => {
      const result = await toggleSignupsOpen(eventId, next);
      if (!result.ok) {
        notify({ title: 'Update failed', description: result.error, variant: 'error' });
        return;
      }
      setIsOpen(next);
      notify({
        title: next ? 'Signups opened' : 'Signups paused',
        variant: 'success',
      });
      router.refresh();
    });
  };

  const label = disabled
    ? 'Event has passed'
    : isOpen
      ? 'Signups open — click to pause'
      : 'Signups paused — click to open';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      aria-pressed={isOpen}
      aria-label={label}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold min-h-[32px] transition disabled:cursor-not-allowed disabled:opacity-60 ${
        isOpen
          ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-400/30'
          : 'bg-amber-400/20 text-amber-200 border border-amber-400/40 hover:bg-amber-400/30'
      }`}
    >
      {isOpen ? (
        <>
          <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
          {pending ? 'Pausing…' : 'Open'}
        </>
      ) : (
        <>
          <Lock className="h-3.5 w-3.5" aria-hidden="true" />
          {pending ? 'Opening…' : 'Paused'}
        </>
      )}
    </button>
  );
}
