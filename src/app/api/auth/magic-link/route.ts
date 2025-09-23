import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  const form = await req.formData()
  const email = String(form.get('email') || '')
  const next = String(form.get('next') || '/mine')
  const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3005'
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`

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
