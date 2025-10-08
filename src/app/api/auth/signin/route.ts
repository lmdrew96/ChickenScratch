import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { logHandledIssue } from '@/lib/logging'
import { roleLandingPath } from '@/lib/auth'
import type { Profile } from '@/types/database'

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const email = String(form.get('email') || '')
    const password = String(form.get('password') || '')

    // Validate required fields
    if (!email || !password) {
      const dest = new URL('/login', req.url)
      dest.searchParams.set('error', 'Email and password are required.')
      return NextResponse.redirect(dest, { status: 303 })
    }

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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error || !data.user) {
      logHandledIssue('auth:signin:failed', {
        reason: 'Failed to sign in with password',
        cause: error,
        context: { email },
      })
      
      const dest = new URL('/login', req.url)
      dest.searchParams.set('error', error?.message || 'Invalid email or password.')
      return NextResponse.redirect(dest, { status: 303 })
    }

    // Get user's profile to determine role-based redirect
    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle()
    
    const profile = profileData as Pick<Profile, 'role'> | null
    
    // Success - redirect based on user role
    const redirectPath = roleLandingPath(profile?.role ?? 'student')
    const dest = new URL(redirectPath, req.url)
    return NextResponse.redirect(dest, { status: 303 })
  } catch (err) {
    logHandledIssue('auth:signin:unexpected-error', {
      reason: 'Unexpected error during sign in',
      cause: err,
    })
    
    const dest = new URL('/login', req.url)
    dest.searchParams.set('error', 'An unexpected error occurred. Please try again.')
    return NextResponse.redirect(dest, { status: 303 })
  }
}
