'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';

import { useToast } from '@/components/ui/toast';
import { submitSignup, type SignupResult } from '@/lib/actions/events';
import {
  SIGNUP_CATEGORIES,
  SIGNUP_CATEGORY_LABEL,
  type SignupCategory,
  type SignupInput,
} from '@/lib/validations/event-signup';

const INPUT_CLASS =
  'block w-full min-h-[44px] rounded-md border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-amber-300/60';

type FormState = {
  name: string;
  email: string;
  item: string;
  category: SignupCategory;
  notes: string;
  honeypot: string;
};

function emptyForm(): FormState {
  return { name: '', email: '', item: '', category: 'sweet', notes: '', honeypot: '' };
}

type FieldErrors = Partial<Record<keyof SignupInput, string>>;

export function SignupForm({ slug }: { slug: string }) {
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
      const result: SignupResult = await submitSignup(slug, {
        name: form.name,
        email: form.email,
        item: form.item,
        category: form.category,
        notes: form.notes || undefined,
        honeypot: form.honeypot,
      });

      if (!result.ok) {
        setFormError(result.error);
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        notify({ title: 'Signup failed', description: result.error, variant: 'error' });
        return;
      }

      notify({ title: "You're on the list!", description: 'Check your inbox for a confirmation.', variant: 'success' });
      setForm(emptyForm());
      router.refresh();
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4"
      aria-describedby={formError ? 'signup-form-error' : undefined}
    >
      {/* Honeypot — hidden from real users, bots fill it */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden">
        <label>
          Do not fill this field
          <input
            type="text"
            name="honeypot"
            tabIndex={-1}
            autoComplete="off"
            value={form.honeypot}
            onChange={(e) => setForm((f) => ({ ...f, honeypot: e.target.value }))}
          />
        </label>
      </div>

      <Field id="signup-name" label="Name" required error={fieldErrors.name}>
        <input
          id="signup-name"
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
        id="signup-email"
        label="UDel email"
        required
        error={fieldErrors.email}
        hint="We send the confirmation here. Must end in @udel.edu."
      >
        <input
          id="signup-email"
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

      <Field id="signup-item" label="What are you bringing?" required error={fieldErrors.item}>
        <input
          id="signup-item"
          type="text"
          required
          maxLength={200}
          value={form.item}
          onChange={(e) => setForm((f) => ({ ...f, item: e.target.value }))}
          className={INPUT_CLASS}
          placeholder="e.g. Chocolate chip cookies"
        />
      </Field>

      <fieldset>
        <legend className="block text-sm font-semibold text-white">Category</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SIGNUP_CATEGORIES.map((c) => {
            const selected = form.category === c;
            return (
              <label
                key={c}
                className={`flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-semibold transition min-h-[44px] ${
                  selected
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[#003b72]'
                    : 'border-white/15 bg-white/5 text-white hover:border-white/30 hover:bg-white/10'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={selected}
                  onChange={() => setForm((f) => ({ ...f, category: c }))}
                  className="sr-only"
                />
                {SIGNUP_CATEGORY_LABEL[c]}
              </label>
            );
          })}
        </div>
        {fieldErrors.category && <p className="mt-1 text-xs text-red-300">{fieldErrors.category}</p>}
      </fieldset>

      <Field
        id="signup-notes"
        label="Notes (optional)"
        error={fieldErrors.notes}
        hint="Allergens, dietary info, serving needs — anything helpful."
      >
        <textarea
          id="signup-notes"
          rows={3}
          maxLength={500}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className={`${INPUT_CLASS} resize-y`}
        />
      </Field>

      {formError && (
        <p
          id="signup-form-error"
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
            Submitting…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" aria-hidden="true" />
            Sign me up
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
