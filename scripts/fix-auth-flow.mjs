import fs from 'fs'; import path from 'path';
const root = process.cwd();
function ensureDir(p){ fs.mkdirSync(path.dirname(p), { recursive: true }); }
function write(file, s){ ensureDir(file); fs.writeFileSync(file, s); }
function read(file){ try{ return fs.readFileSync(file,'utf8') } catch{ return '' } }
function up(file, fn){ const prev = read(file); const next = fn(prev); if (next !== prev) write(file,next); }

// 1) API: password sign-in (sets HTTP-only cookies on the server)
write('src/app/api/auth/signin/route.ts', `
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const email = String(form.get('email') || '')
  const password = String(form.get('password') || '')
  const next = String(form.get('next') || '/mine')

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options, expires: new Date(0) }) },
      },
    }
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  const dest = new URL(error ? '/login' : next, req.url)
  if (error) dest.searchParams.set('error', error.message)
  return NextResponse.redirect(dest, { status: 303 })
}
`.trim() + '\n')

// 2) API: magic-link sender (emails link to /auth/callback, no cookies yet)
write('src/app/api/auth/magic-link/route.ts', `
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const email = String(form.get('email') || '')
  const next = String(form.get('next') || '/mine')
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005'
  const emailRedirectTo = \`\${origin}/auth/callback?next=\${encodeURIComponent(next)}\`

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options, expires: new Date(0) }) },
      },
    }
  )

  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })
  const dest = new URL('/login', req.url)
  if (error) dest.searchParams.set('error', error.message)
  else dest.searchParams.set('sent', '1')
  dest.searchParams.set('email', email)
  return NextResponse.redirect(dest, { status: 303 })
}
`.trim() + '\n')

// 3) Callback route: exchanges code for session (sets HTTP-only cookies), then redirects
write('src/app/auth/callback/route.ts', `
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const next = url.searchParams.get('next') || '/mine'

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options, expires: new Date(0) }) },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(url.searchParams)
  const dest = new URL(error ? '/login' : next, req.url)
  if (error) dest.searchParams.set('error', error.message)
  return NextResponse.redirect(dest, { status: 303 })
}
`.trim() + '\n')

// 4) Patch LoginForm to post to server routes (password + magic link)
const loginFormPath = 'src/components/forms/login-form.tsx'
const loginFormTSX = `
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
`.trim() + '\n';
write(loginFormPath, loginFormTSX)

// 5) Ensure /login page exists and uses LoginForm
const loginPagePath = 'src/app/login/page.tsx'
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
write(loginPagePath, loginPageTSX)

// 6) Make sure layout computes "signedIn" on server and passes it to Sidebar
const layoutPath = 'src/app/layout.tsx'
up(layoutPath, (s) => {
  if (!s.includes('Sidebar')) return s;
  if (!/createServerClient|serverReadOnly|createSupabaseServerReadOnlyClient/.test(s)) {
    s = s.replace(/(^import\s+['"]\.\/globals\.css['"].*\n)/m, (m) => 
      m + `import { cookies } from 'next/headers'\nimport { createServerClient } from '@supabase/ssr'\n`
    )
  }
  s = s.replace(
    /export default function RootLayout\(\{ children[^}]*\}\s*:\s*\{[^}]*\}\)\s*\{/,
    'export default async function RootLayout({ children }: { children: React.ReactNode }) {'
  )
  if (!s.includes('const signedIn =')) {
    s = s.replace(/\{\s*return\s*\(/, `{
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options, expires: new Date(0) }) },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  const signedIn = !!user

  return (
`)
  }
  s = s.replace(/<Sidebar\s*(\/>|>)/, '<Sidebar signedIn={signedIn} />')
  return s
})

// 7) Sidebar must accept prop signedIn and conditionally render Login/Sign out
const sidebarPath = 'src/components/shell/sidebar.tsx'
up(sidebarPath, (s) => {
  if (!s.trim()) return s;
  if (!s.startsWith("'use client'")) s = `'use client'\n` + s;
  s = s.replace(/export default function Sidebar\(\)/, 'export default function Sidebar({ signedIn = false }: { signedIn?: boolean })')
  if (!/Sign out/.test(s) || !/href="\/login"/.test(s)) {
    s = s.replace(
      /<\/nav>[\s\S]*?<\/aside>/m,
      `</nav>
      <div style={{ marginTop: 'auto' }}>
        {signedIn ? (
          <form action="/api/auth/signout" method="post" style={{ display: 'inline-block', marginTop: '1rem' }}>
            <button type="submit" className="btn" aria-label="Sign out">Sign out</button>
          </form>
        ) : (
          <a href="/login" className="btn btn-accent" style={{ display: 'inline-flex', marginTop: '1rem' }}>
            Login
          </a>
        )}
      </div>
    </aside>`
    )
  }
  return s
})

console.log('✓ Auth flow fixed: server-side password sign-in, magic links, callback, sidebar toggles.')
