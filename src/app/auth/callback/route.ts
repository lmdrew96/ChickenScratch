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
