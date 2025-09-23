'use client'

import * as React from 'react'
import { useSearchParams } from 'next/navigation'

export default function LoginForm() {
  const params = useSearchParams()
  const next = params.get('next') || '/mine'
  const error = params.get('error')
  const sent = params.get('sent')
  const emailPrefill = params.get('email') || ''

  const [email, setEmail] = React.useState(emailPrefill)
  const [password, setPassword] = React.useState('')

  return (
    <form method="post" action="/api/auth/signin" className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-lg max-w-md">
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--accent)' }}>Sign in</h2>

      {sent ? <p className="mb-3 text-sm text-slate-300">We emailed a sign-in link to <span className="font-medium text-white">{emailPrefill}</span>.</p> : null}
      {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

      <input type="hidden" name="next" value={next} />

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          Email <span className="ml-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none border-slate-500/40 focus:border-[var(--accent)]"
          placeholder="you@udel.edu"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          autoComplete="email"
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
          onChange={(e)=>setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-accent">Sign in</button>
        <button type="submit" formAction="/api/auth/magic-link" className="btn">Email me a magic link</button>
        <a href="/signup" className="btn">Sign up</a>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        After sign-in you’ll go to <span className="text-slate-300">{next}</span>.
      </p>
    </form>
  )
}
