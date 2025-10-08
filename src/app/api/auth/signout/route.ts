import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { logHandledIssue } from '@/lib/logging'

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: Record<string, unknown>) {
            cookieStore.set({ name, value: '', ...options, expires: new Date(0) })
          },
        },
      }
    )

    // Revoke refresh token & clear cookies
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      logHandledIssue('auth:signout:failed', {
        reason: 'Failed to sign out',
        cause: error,
      })
      // Still redirect to login even if signout fails
    }
    
    const url = new URL('/login', req.url)
    return NextResponse.redirect(url, { status: 303 })
  } catch (err) {
    logHandledIssue('auth:signout:unexpected-error', {
      reason: 'Unexpected error during sign out',
      cause: err,
    })
    
    // Still redirect to login even on error
    const url = new URL('/login', req.url)
    return NextResponse.redirect(url, { status: 303 })
  }
}
