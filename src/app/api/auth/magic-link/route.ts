import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { logHandledIssue } from '@/lib/logging'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const email = String(form.get('email') || '')
    const next = String(form.get('next') || '/mine')

    // Validate required fields
    if (!email) {
      const dest = new URL('/login', req.url)
      dest.searchParams.set('error', 'Email is required.')
      return NextResponse.redirect(dest, { status: 303 })
    }

    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005'
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: Record<string, unknown>) { cookieStore.set({ name, value, ...options }) },
          remove(name: string, options: Record<string, unknown>) { cookieStore.set({ name, value: '', ...options, expires: new Date(0) }) },
        },
      }
    )

    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })
    
    const dest = new URL('/login', req.url)
    
    if (error) {
      logHandledIssue('auth:magic-link:failed', {
        reason: 'Failed to send magic link',
        cause: error,
        context: { email },
      })
      dest.searchParams.set('error', error.message || 'Failed to send magic link. Please try again.')
    } else {
      dest.searchParams.set('sent', '1')
    }
    
    dest.searchParams.set('email', email)
    return NextResponse.redirect(dest, { status: 303 })
  } catch (err) {
    logHandledIssue('auth:magic-link:unexpected-error', {
      reason: 'Unexpected error during magic link request',
      cause: err,
    })
    
    const dest = new URL('/login', req.url)
    dest.searchParams.set('error', 'An unexpected error occurred. Please try again.')
    return NextResponse.redirect(dest, { status: 303 })
  }
}
