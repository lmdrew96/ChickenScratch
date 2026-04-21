'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Mic } from 'lucide-react';

import { useToast } from '@/components/ui/toast';
import { submitPerformanceSignup, type PerformanceSignupResult } from '@/lib/actions/events';
import {
  MAX_PERFORMANCE_MINUTES,
  PERFORMANCE_KINDS,
  PERFORMANCE_KIND_LABEL,
  type PerformanceKind,
  type PerformanceSignupInput,
} from '@/lib/validations/event-performance-signup';

const INPUT_CLASS =
  'block w-full min-h-[44px] rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-amber-300/60';

type FormState = {
  name: string;
  email: string;
  kind: PerformanceKind;
  piece_title: string;
  estimated_minutes: string;
  content_warnings: string;
  notes: string;
  honeypot: string;
};

function emptyForm(): FormState {
  return {
    name: '',
    email: '',
    kind: 'poetry',
    piece_title: '',
    estimated_minutes: '5',
    content_warnings: '',
    notes: '',
    honeypot: '',
  };
}

type FieldErrors = Partial<Record<keyof PerformanceSignupInput, string>>;

export function PerformanceSignupForm({ slug }: { slug: string }) {
  const router = useRouter();
  const { notify } = useToast();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError(null);

    startTransition(async () => {
      const result: PerformanceSignupResult = await submitPerformanceSignup(slug, {
        name: form.name,
        email: form.email,
        kind: form.kind,
        piece_title: form.piece_title,
        estimated_minutes: form.estimated_minutes,
        content_warnings: form.content_warnings || undefined,
        notes: form.notes || undefined,
        honeypot: form.honeypot,
      });

      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        notify({ title: 'Signup failed', description: result.error, variant: 'error' });
        return;
      }

      notify({
        title: "You're on the bill!",
        description: 'Check your inbox for a confirmation.',
        variant: 'success',
      });
      setForm(emptyForm());
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4"
      aria-describedby={formError ? 'performance-form-error' : undefined}
    >
      {/* Honeypot — hidden from real users, bots fill it */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Do not fill this field
          <input
            type="text"
            name="performance_honeypot"
            tabIndex={-1}
            autoComplete="off"
            value={form.honeypot}
            onChange={(e) => setForm((f) => ({ ...f, honeypot: e.target.value }))}
          />
        </label>
      </div>

      <Field id="perf-name" label="Name" required error={fieldErrors.name}>
        <input
          id="perf-name"
          type="text"
          required
          maxLength={100}
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={INPUT_CLASS}
        />
      </Field>

      <Field
        id="perf-email"
        label="UDel email"
        required
        error={fieldErrors.email}
        hint="We send the confirmation here. Must end in @udel.edu."
      >
        <input
          id="perf-email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          inputMode="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          className={INPUT_CLASS}
          placeholder="you@udel.edu"
        />
      </Field>

      <fieldset>
        <legend className="block text-sm font-semibold text-white">What are you performing?</legend>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PERFORMANCE_KINDS.map((k) => {
            const selected = form.kind === k;
            return (
              <label
                key={k}
                className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold transition min-h-[44px] ${
                  selected
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[#003b72]'
                    : 'border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="performance_kind"
                  value={k}
                  checked={selected}
                  onChange={() => setForm((f) => ({ ...f, kind: k }))}
                  className="sr-only"
                />
                {PERFORMANCE_KIND_LABEL[k]}
              </label>
            );
          })}
        </div>
        {fieldErrors.kind && <p className="mt-1 text-xs text-red-300">{fieldErrors.kind}</p>}
      </fieldset>

      <Field id="perf-title" label="Piece title" required error={fieldErrors.piece_title}>
        <input
          id="perf-title"
          type="text"
          required
          maxLength={200}
          value={form.piece_title}
          onChange={(e) => setForm((f) => ({ ...f, piece_title: e.target.value }))}
          className={INPUT_CLASS}
          placeholder="e.g. &ldquo;Field Notes from Lewes Beach&rdquo;"
        />
      </Field>

      <Field
        id="perf-minutes"
        label="Estimated length (minutes)"
        required
        error={fieldErrors.estimated_minutes}
        hint={`Up to ${MAX_PERFORMANCE_MINUTES} minutes per slot. Need more? Sign up twice.`}
      >
        <input
          id="perf-minutes"
          type="number"
          required
          min={1}
          max={MAX_PERFORMANCE_MINUTES}
          step={1}
          inputMode="numeric"
          value={form.estimated_minutes}
          onChange={(e) => setForm((f) => ({ ...f, estimated_minutes: e.target.value }))}
          className={INPUT_CLASS}
        />
      </Field>

      <Field
        id="perf-cw"
        label="Content warnings (optional)"
        error={fieldErrors.content_warnings}
        hint="Anything an audience member should know going in."
      >
        <textarea
          id="perf-cw"
          rows={2}
          maxLength={500}
          value={form.content_warnings}
          onChange={(e) => setForm((f) => ({ ...f, content_warnings: e.target.value }))}
          className={`${INPUT_CLASS} resize-y`}
          placeholder="e.g. grief, mild language"
        />
      </Field>

      <Field
        id="perf-notes"
        label="Notes for the organizers (optional)"
        error={fieldErrors.notes}
        hint="Tech needs, co-performers, props, accessibility — anything helpful."
      >
        <textarea
          id="perf-notes"
          rows={2}
          maxLength={500}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className={`${INPUT_CLASS} resize-y`}
        />
      </Field>

      <p className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
        By signing up, you agree to keep your piece within the same standards as a Hen &amp; Ink
        Society submission &mdash; no graphic sex or violence, and no incitement of either. An
        officer will reach out if anything needs adjusting.
      </p>

      {formError && (
        <p
          id="performance-form-error"
          role="alert"
          className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200"
        >
          {formError}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[#003b72] transition hover:bg-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Submitting&hellip;
          </>
        ) : (
          <>
            <Mic className="h-4 w-4" aria-hidden="true" />
            Put me on the bill
          </>
        )}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-white">
        {label}
        {required && (
          <span className="ml-1 text-[var(--accent)]" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-xs text-red-300">{error}</p>}
    </div>
  );
}
