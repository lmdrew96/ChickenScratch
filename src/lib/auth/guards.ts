import { redirect } from 'next/navigation'
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly'

export async function requireUser(nextUrl?: string) {
  const supabase = await createSupabaseServerReadOnlyClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=' + encodeURIComponent(nextUrl || '/'))
  return user
}

export async function requireRole(role: string | string[], nextUrl?: string) {
  const user = await requireUser(nextUrl)
  const roles = ((user?.app_metadata as any)?.roles as string[]) || []
  const need = Array.isArray(role) ? role : [role]
  if (!need.some(r => roles.includes(r))) redirect('/forbidden')
  return user
}
