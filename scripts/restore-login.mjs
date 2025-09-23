import fs from 'fs'; import path from 'path';

const root = process.cwd();
function ensureDir(p){ fs.mkdirSync(path.dirname(p), { recursive: true }); }
function writeIfDiff(file, contents){
  ensureDir(file);
  let prev = '';
  try { prev = fs.readFileSync(file,'utf8'); } catch {}
  if (prev !== contents) fs.writeFileSync(file, contents);
}

// 1) Supabase browser client
const supaBrowserPath = path.join(root, 'src/lib/supabase/browser.ts');
const supaBrowserTS = `
import { createClient } from '@supabase/supabase-js'

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Missing Supabase env: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
}
`.trim() + '\n';
writeIfDiff(supaBrowserPath, supaBrowserTS);

// 2) LoginForm (client)
const loginFormPath = path.join(root, 'src/components/forms/login-form.tsx');
const loginFormTSX = `
'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

export default function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/mine'
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      router.push(next)
    } catch (err: any) {
      setError(err?.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-lg max-w-md">
      <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--accent)' }}>Sign in</h2>

      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          Email <span className="ml-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="email"
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
          Password <span className="ml-1 text-red-500" aria-hidden="true">*</span>
        </label>
        <input
          id="password"
          type="password"
          required
          className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none border-slate-500/40 focus:border-[var(--accent)]"
          placeholder="••••••••"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <div className="mt-6 flex items-center gap-3">
        <button type="submit" className="btn btn-accent" disabled={loading} aria-busy={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
        <a href="/signup" className="btn">Sign up</a>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        You’ll be redirected to <span className="text-slate-300">{next}</span> after signing in.
      </p>
    </form>
  )
}
`.trim() + '\n';
writeIfDiff(loginFormPath, loginFormTSX);

// 3) /login page (server)
const loginPagePath = path.join(root, 'src/app/login/page.tsx');
const loginPageTSX = `
import PageHeader from '@/components/shell/page-header'
import LoginForm from '@/components/forms/login-form'

export const metadata = { title: 'Login' }

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Login" />
      <div className="mx-auto mt-6 max-w-4xl">
        <LoginForm />
      </div>
    </div>
  )
}
`.trim() + '\n';
writeIfDiff(loginPagePath, loginPageTSX);

// 4) Ensure sidebar has a /login link (shown only when signed out by your toggle)
const sidebarPath = path.join(root, 'src/components/shell/sidebar.tsx');
if (fs.existsSync(sidebarPath)) {
  let s = fs.readFileSync(sidebarPath,'utf8');
  const before = s;
  // Make sure it imports Link and has a Login link somewhere; your auth toggle script may render it conditionally.
  if (!/href="\/login"/.test(s)) {
    s = s.replace(
      /<\/nav>/,
      `  <a href="/login" className="btn btn-accent" style={{ display: 'none' }}>Login</a>\n      </nav>`
    );
  }
  if (s !== before) fs.writeFileSync(sidebarPath, s);
}

console.log('✓ /login restored with working LoginForm and browser Supabase client')
