import fs from 'fs'; import path from 'path';
const R = process.cwd();
const p = (...xs) => path.join(R, ...xs);
const exists = (f)=> fs.existsSync(f);
const read = (f)=> exists(f) ? fs.readFileSync(f,'utf8') : '';
const write = (f,s)=>{ fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,s) };

// 1) Route-level error boundary (no <html>/<body>)
write(p('src/app/error.tsx'), `
'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold">Chicken Scratch ran into an error</h2>
      <pre className="mt-3 whitespace-pre-wrap text-sm opacity-80">{error.message}</pre>
      <button className="btn btn-accent mt-4" onClick={() => reset()}>Try again</button>
    </div>
  )
}
`.trim() + '\n');

// 2) Global error (this one *does* include <html>/<body>)
if (!exists(p('src/app/global-error.tsx'))) {
  write(p('src/app/global-error.tsx'), `
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body>
        <div className="p-6">
          <h2 className="text-xl font-semibold">Something went wrong</h2>
          <pre className="mt-3 whitespace-pre-wrap text-sm opacity-80">{error.message}</pre>
          <button className="btn btn-accent mt-4" onClick={() => reset()}>Try again</button>
        </div>
      </body>
    </html>
  )
}
`.trim() + '\n');
}

// 3) Ensure AccountEditor exists (name + avatar uploader to storage bucket "avatars")
if (!exists(p('src/components/account/account-editor.tsx'))) {
  write(p('src/components/account/account-editor.tsx'), `
'use client'

import * as React from 'react'
import Image from 'next/image'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type Props = { initialName: string; initialAvatarUrl: string | null }

export default function AccountEditor({ initialName, initialAvatarUrl }: Props) {
  const [name, setName] = React.useState(initialName || '')
  const [file, setFile] = React.useState<File | null>(null)
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(initialAvatarUrl || null)
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)
  const [err, setErr] = React.useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null); setErr(null); setSaving(true)
    try {
      const supabase = createSupabaseBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not signed in')

      let nextAvatar = avatarUrl

      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const key = \`\${user.id}/\${Date.now()}.\${ext}\`
        const { error: upErr } = await supabase.storage.from('avatars').upload(key, file, { upsert: true, cacheControl: '3600' })
        if (upErr) throw upErr
        const { data } = supabase.storage.from('avatars').getPublicUrl(key)
        nextAvatar = data.publicUrl
      }

      const { error: profErr } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: name || null,
        avatar_url: nextAvatar || null,
      }, { onConflict: 'id' })
      if (profErr) throw profErr

      await supabase.auth.updateUser({ data: { full_name: name || null, name: name || null, avatar_url: nextAvatar || null } })
      setAvatarUrl(nextAvatar || null)
      setMsg('Saved!')
    } catch (e: any) {
      setErr(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSave} className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white/15 bg-white/10">
          {avatarUrl
            ? <Image src={avatarUrl} alt="Avatar" fill style={{ objectFit: 'cover' }} />
            : <div className="grid h-full w-full place-items-center text-sm text-slate-400">No photo</div>}
        </div>
        <div className="grid gap-2">
          <input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0] ?? null)}
                 className="text-sm file:mr-3 file:rounded file:border file:border-white/15 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:text-white/90" />
          <p className="text-xs text-slate-400">Use a square image for best results.</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <label htmlFor="name" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Display name</label>
        <input id="name" value={name} onChange={e=>setName(e.target.value)}
               className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none border-slate-500/40 focus:border-[var(--accent)]"
               placeholder="Your name as shown on the portal" />
      </div>

      <div className="mt-6 flex items-center gap-3">
        <button type="submit" className="btn btn-accent" disabled={saving} aria-busy={saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        {msg ? <span className="text-sm text-emerald-400">{msg}</span> : null}
        {err ? <span className="text-sm text-red-400">{err}</span> : null}
      </div>
    </form>
  )
}
`.trim() + '\n');
}

// 4) Make /account page load AccountEditor and avoid undefined import
{
  const f = p('src/app/account/page.tsx');
  const base = `
import PageHeader from '@/components/shell/page-header'
import AccountEditor from '@/components/account/account-editor'
import { requireUser } from '@/lib/auth/guards'
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly'

export const metadata = { title: 'Account' }

export default async function AccountPage() {
  const user = await requireUser('/account')
  const supabase = await createSupabaseServerReadOnlyClient()

  let full_name: string | null = null
  let primaryRole: string | null = null
  let avatar_url: string | null = null

  try {
    const { data } = await supabase.from('profiles')
      .select('full_name, role, avatar_url')
      .eq('id', user.id)
      .single()
    full_name = (data as any)?.full_name ?? null
    primaryRole = (data as any)?.role ?? null
    avatar_url = (data as any)?.avatar_url ?? (user.user_metadata?.avatar_url ?? null)
  } catch {}

  const roles = ((user?.app_metadata as any)?.roles as string[]) || []
  const email = user?.email ?? ''
  const name = full_name || (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || email
  const roleList = roles.length ? roles.join(', ') : '—'
  const primary = primaryRole || (roles[0] ?? 'member')

  return (
    <div className="space-y-6">
      <PageHeader title="Your account" />
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-lg">
        <dl className="grid gap-4 md:grid-cols-2">
          <div><dt className="text-sm text-slate-400">Name</dt><dd className="text-base">{name}</dd></div>
          <div><dt className="text-sm text-slate-400">Email</dt><dd className="text-base">{email}</dd></div>
          <div><dt className="text-sm text-slate-400">Primary role</dt><dd className="text-base">{primary}</dd></div>
          <div><dt className="text-sm text-slate-400">All roles</dt><dd className="text-base">{roleList}</dd></div>
        </dl>
        <p className="mt-6 text-sm text-slate-400">Roles are managed by admins. If something looks wrong, contact the committee.</p>
      </div>
      <AccountEditor initialName={name} initialAvatarUrl={avatar_url} />
    </div>
  )
}
`.trim() + '\n';

  if (!exists(f) || !read(f).includes('AccountEditor')) write(f, base);
  else {
    let s = read(f);
    if (!/import\s+AccountEditor/.test(s)) {
      s = s.replace(/import PageHeader[^\n]+;\n/, m => m + `import AccountEditor from '@/components/account/account-editor'\n`);
    }
    if (!/AccountEditor/.test(s)) {
      s = s.replace(/<\/div>\s*\)\s*}[\s]*$/m, `
        <AccountEditor initialName={name} initialAvatarUrl={avatar_url ?? null} />
      </div>
    ) }
    `);
    }
    write(f, s);
  }
}

// 5) Favicon to silence 404 (copy logo as ico)
{
  const pub = p('public'); fs.mkdirSync(pub, { recursive: true });
  const src1 = p('1.png'); const src2 = p('2.png');
  const ico = p('public/favicon.ico');
  if (!exists(ico)) {
    if (exists(src2)) fs.copyFileSync(src2, ico);
    else if (exists(src1)) fs.copyFileSync(src1, ico);
  }
}

// 6) Patch layout.tsx: async + fetch user/profile + avatar badge with fallback initials
{
  const f = p('src/app/layout.tsx');
  if (exists(f)) {
    let s = read(f);

    if (!/createSupabaseServerReadOnlyClient/.test(s)) {
      s = s.replace(/(from 'next\/font\/[^\n]+'\);\n)?/, (m)=> m + `import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly'\n`);
    }

    s = s.replace(/export default function RootLayout\(/, 'export default async function RootLayout(');

    if (!/auth\.getUser\(\)/.test(s)) {
      s = s.replace(/export default async function RootLayout\([^\)]*\)\s*{/, (m)=> m + `
  const supabase = await createSupabaseServerReadOnlyClient()
  const { data: { user } } = await supabase.auth.getUser()
  let avatarUrl: string | null = null
  let displayName: string | null = null
  if (user) {
    try {
      const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).single()
      avatarUrl = (data as any)?.avatar_url ?? (user.user_metadata?.avatar_url ?? null)
      displayName = (data as any)?.full_name ?? (user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null)
    } catch {}
  }
  const signedIn = !!user
  const initials = (displayName ?? '')
    .split(/\\s+/).map(p => p[0]).filter(Boolean).slice(0,2).join('').toUpperCase()
    || (user?.email?.[0] ?? '').toUpperCase()
`);
    }

    if (/className="account-badge"/.test(s)) {
      s = s.replace(
        /<a\s+href="\/account"\s+className="account-badge"[\s\S]*?<\/a>/,
        `{signedIn && (
  <a href="/account" className="account-badge" aria-label="Your account">
    <span className="sr-only">Your account</span>
    {avatarUrl ? (
      <img src={avatarUrl || ''} alt="" className="h-8 w-8 rounded-full ring-2 ring-[--accent] object-cover" />
    ) : (
      <span className="h-8 w-8 rounded-full grid place-items-center font-semibold bg-[--accent] text-[--brand]">{initials}</span>
    )}
  </a>
)}`.trim()
      );
    } else {
      // If there is no existing badge, inject one at end of body
      s = s.replace(/<\/body>\s*<\/html>\s*$/, `
  {signedIn && (
    <a href="/account" className="account-badge" aria-label="Your account" style={{position:'fixed',top:'1rem',right:'1rem',zIndex:50}}>
      <span className="sr-only">Your account</span>
      {avatarUrl ? (
        <img src={avatarUrl || ''} alt="" className="h-8 w-8 rounded-full ring-2 ring-[--accent] object-cover" />
      ) : (
        <span className="h-8 w-8 rounded-full grid place-items-center font-semibold bg-[--accent] text-[--brand]">{initials}</span>
      )}
    </a>
  )}
</body>
</html>
`);
    }

    write(f, s);
  }
}

console.log('✓ Fixed error boundaries\n✓ Ensured AccountEditor + Account page\n✓ Added favicon\n✓ Wired account badge to avatar/initials and gated by auth')
