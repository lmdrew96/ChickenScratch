import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { logHandledIssue } from '@/lib/logging'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const next = url.searchParams.get('next') || '/mine'
  const code = url.searchParams.get('code')

  // Validate required parameters
  if (!code) {
    logHandledIssue('auth:callback:missing-code', {
      reason: 'Auth callback invoked without code parameter',
      context: { url: url.toString() },
    })
    const dest = new URL('/login', req.url)
    dest.searchParams.set('error', 'Authentication failed. Please try signing in again.')
    return NextResponse.redirect(dest, { status: 303 })
  }

  try {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      logHandledIssue('auth:callback:exchange-failed', {
        reason: 'Failed to exchange code for session',
        cause: error,
        context: { code: code.substring(0, 10) + '...' }, // Log partial code for debugging
      })
      
      const dest = new URL('/login', req.url)
      dest.searchParams.set('error', 'Authentication failed. The link may have expired. Please try again.')
      return NextResponse.redirect(dest, { status: 303 })
    }

    // Success - redirect to intended destination
    const dest = new URL(next, req.url)
    return NextResponse.redirect(dest, { status: 303 })
  } catch (err) {
    logHandledIssue('auth:callback:unexpected-error', {
      reason: 'Unexpected error during auth callback',
      cause: err,
    })
    
    const dest = new URL('/login', req.url)
    dest.searchParams.set('error', 'An unexpected error occurred. Please try signing in again.')
    return NextResponse.redirect(dest, { status: 303 })
  }
}
