'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'
import { registerAction } from '@/lib/actions/auth'
import { ErrorMessage, FieldError } from '@/components/ui/feedback'
import { LoadingSpinner } from '@/components/shared/loading-states'
import {
  HelperText,
  PasswordStrengthIndicator,
  ValidationFeedback,
  RequiredIndicator,
} from '@/components/ui/form-helpers'
import {
  validateField,
  commonValidations,
  calculatePasswordStrength,
  debounce,
} from '@/lib/form-validation'

export default function SignupForm() {
  const params = useSearchParams()
  const next = params.get('next') || '/mine'
  const error = params.get('error')

  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [name, setName] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [formError, setFormError] = React.useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = React.useState<{
    name?: string
    email?: string
    password?: string
  }>({})
  const [touched, setTouched] = React.useState<{
    name?: boolean
    email?: boolean
    password?: boolean
  }>({})
  const [passwordStrength, setPasswordStrength] = React.useState<{
    strength: 'weak' | 'fair' | 'good' | 'strong'
    score: number
    feedback: string[]
  } | null>(null)

  // Real-time validation with debounce
  const validateNameDebounced = React.useMemo(
    () =>
      debounce((value: string) => {
        if (!touched.name) return
        const result = validateField(value, commonValidations.name)
        setFieldErrors((prev) => ({
          ...prev,
          name: result.error,
        }))
      }, 500),
    [touched.name]
  )

  const validateEmailDebounced = React.useMemo(
    () =>
      debounce((value: string) => {
        if (!touched.email) return
        const result = validateField(value, commonValidations.email)
        setFieldErrors((prev) => ({
          ...prev,
          email: result.error,
        }))
      }, 500),
    [touched.email]
  )

  React.useEffect(() => {
    if (password) {
      const strength = calculatePasswordStrength(password)
      setPasswordStrength(strength)
    } else {
      setPasswordStrength(null)
    }
  }, [password])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setFormError(null)
    setFieldErrors({})

    // Mark all fields as touched
    setTouched({ name: true, email: true, password: true })

    // Client-side validation
    const errors: typeof fieldErrors = {}
    
    const nameResult = validateField(name, commonValidations.name)
    if (!nameResult.isValid) {
      errors.name = nameResult.error
    }
    
    const emailResult = validateField(email, commonValidations.email)
    if (!emailResult.isValid) {
      errors.email = emailResult.error
    }
    
    const passwordResult = validateField(password, commonValidations.password)
    if (!passwordResult.isValid) {
      errors.password = passwordResult.error
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      setIsLoading(false)
      return
    }

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)
    formData.append('name', name)

    try {
      const result = await registerAction({ status: 'idle' }, formData)
      
      if (result.status === 'error') {
        setFormError(result.message || 'An error occurred during registration.')
        setIsLoading(false)
      }
      // If successful, registerAction will redirect automatically
    } catch {
      setFormError('Unable to connect to the server. Please check your internet connection and try again.')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-lg max-w-md">
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--accent)' }}>Create Account</h2>

      {(error || formError) && (
        <ErrorMessage
          title="Registration failed"
          message={error || formError || ''}
          className="mb-4"
          actions={[
            {
              label: 'Try Again',
              onClick: () => {
                setFormError(null)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              },
              variant: 'primary'
            }
          ]}
          onDismiss={() => setFormError(null)}
        />
      )}

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          Full Name
          <RequiredIndicator />
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none border-slate-500/40 focus:border-[var(--accent)]"
          placeholder="Your full name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            validateNameDebounced(e.target.value)
          }}
          onBlur={() => {
            setTouched((prev) => ({ ...prev, name: true }))
            const result = validateField(name, commonValidations.name)
            setFieldErrors((prev) => ({ ...prev, name: result.error }))
          }}
          disabled={isLoading}
          autoComplete="name"
        />
        <ValidationFeedback
          isValid={!fieldErrors.name && touched.name === true && name.length > 0}
          error={fieldErrors.name}
          successMessage="Looks good!"
          showSuccess={touched.name === true}
        />
      </div>

      <div className="mt-4 space-y-2">
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
            setTouched((prev) => ({ ...prev, email: true }))
            const result = validateField(email, commonValidations.email)
            setFieldErrors((prev) => ({ ...prev, email: result.error }))
          }}
          disabled={isLoading}
          autoComplete="email"
        />
        <ValidationFeedback
          isValid={!fieldErrors.email && touched.email === true && email.length > 0}
          error={fieldErrors.email}
          successMessage="Valid email address"
          showSuccess={touched.email === true}
        />
        <HelperText>Use your institutional email address for verification</HelperText>
      </div>

      <div className="mt-4 space-y-2">
        <label htmlFor="password" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          Password
          <RequiredIndicator />
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none border-slate-500/40 focus:border-[var(--accent)]"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setTouched((prev) => ({ ...prev, password: true }))
          }}
          onBlur={() => {
            const result = validateField(password, commonValidations.password)
            setFieldErrors((prev) => ({ ...prev, password: result.error }))
          }}
          disabled={isLoading}
          autoComplete="new-password"
        />
        <FieldError error={fieldErrors.password} />
        {passwordStrength && (
          <PasswordStrengthIndicator
            password={password}
            strength={passwordStrength.strength}
            feedback={passwordStrength.feedback}
          />
        )}
        {!password && (
          <HelperText>
            Use a strong password with uppercase, lowercase, numbers, and special characters
          </HelperText>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button 
          type="submit" 
          className="btn btn-accent"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" />
              Creating Account...
            </>
          ) : (
            'Sign Up'
          )}
        </button>
        <a href="/login" className="btn">Already have an account?</a>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        After sign-up you&apos;ll go to <span className="text-slate-300">{next}</span>.
      </p>
    </form>
  )
}
