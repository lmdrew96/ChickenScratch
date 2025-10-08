'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { ErrorMessage, SuccessMessage } from '@/components/ui/feedback'
import { LoadingSpinner } from '@/components/shared/loading-states'
import { HelperText, RequiredIndicator, ValidationFeedback } from '@/components/ui/form-helpers'
import { validateField, commonValidations, debounce } from '@/lib/form-validation'

export default function LoginForm() {
  const params = useSearchParams()
  const next = params.get('next') || '/mine'
  const error = params.get('error')
  const sent = params.get('sent')
  const emailPrefill = params.get('email') || ''

  const [email, setEmail] = React.useState(emailPrefill)
  const [password, setPassword] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isMagicLink, setIsMagicLink] = React.useState(false)
  const [emailError, setEmailError] = React.useState<string | undefined>()
  const [touched, setTouched] = React.useState(false)

  // Real-time email validation
  const validateEmailDebounced = React.useMemo(
    () =>
      debounce((value: string) => {
        if (!touched) return
        const result = validateField(value, commonValidations.email)
        setEmailError(result.error)
      }, 500),
    [touched]
  )

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement
    setIsMagicLink(submitter?.formAction?.includes('magic-link') || false)
    setIsSubmitting(true)
  }

  return (
    <form 
      method="post" 
      action="/api/auth/signin" 
      className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-lg max-w-md"
      onSubmit={handleSubmit}
    >
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--accent)' }}>Sign in</h2>

      {sent && (
        <SuccessMessage
          title="Check your email"
          message={`We sent a sign-in link to ${emailPrefill}. Click the link in the email to sign in.`}
          className="mb-4"
        />
      )}
      
      {error && (
        <ErrorMessage
          title="Sign in failed"
          message={error}
          className="mb-4"
          actions={[
            {
              label: 'Try Again',
              onClick: () => window.location.href = '/login',
              variant: 'primary'
            }
          ]}
        />
      )}

      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          Email
          <RequiredIndicator />
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none border-slate-500/40 focus:border-[var(--accent)]"
          placeholder="you@udel.edu"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            validateEmailDebounced(e.target.value)
          }}
          onBlur={() => {
            setTouched(true)
            const result = validateField(email, commonValidations.email)
            setEmailError(result.error)
          }}
          autoComplete="email"
        />
        <ValidationFeedback
          isValid={!emailError && touched && email.length > 0}
          error={emailError}
          successMessage="Valid email"
          showSuccess={touched}
        />
      </div>

      <div className="mt-4 space-y-2">
        <label htmlFor="password" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none border-slate-500/40 focus:border-[var(--accent)]"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />
        <HelperText>
          Leave blank to receive a magic link via email
        </HelperText>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button 
          type="submit" 
          className="btn btn-accent" 
          disabled={isSubmitting && !isMagicLink}
        >
          {isSubmitting && !isMagicLink ? (
            <>
              <LoadingSpinner size="sm" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </button>
        <button 
          type="submit" 
          formAction="/api/auth/magic-link" 
          className="btn"
          disabled={isSubmitting && isMagicLink}
        >
          {isSubmitting && isMagicLink ? (
            <>
              <LoadingSpinner size="sm" />
              Sending...
            </>
          ) : (
            'Email me a magic link'
          )}
        </button>
        <a href="/signup" className="btn">Sign up</a>
      </div>

      <div className="mt-4 space-y-2">
        <HelperText>
          After sign-in you&apos;ll be redirected to <span className="text-slate-300">{next}</span>
        </HelperText>
        <HelperText>
          Don&apos;t have an account? <a href="/signup" className="text-[var(--accent)] hover:underline">Sign up here</a>
        </HelperText>
      </div>
    </form>
  )
}
