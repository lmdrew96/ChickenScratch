import fs from 'fs'; import path from 'path';
const root = process.cwd();
const p = (...xs) => path.join(root, ...xs);
const w = (f,s)=>{ fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,s) };
const r = (f)=> fs.existsSync(f) ? fs.readFileSync(f,'utf8') : '';
const up = (f,fn)=>{ const prev=r(f); const next=fn(prev); if(next!==prev) w(f,next) };

// 1) Client editor component (name + avatar upload via Supabase Storage "avatars" bucket)
w(p('src/components/account/account-editor.tsx'), `
'use client'

import * as React from 'react'
import Image from 'next/image'
import { createSupabaseBrowserClient } from '@/lib/supabase/browser'

type Props = {
  initialName: string
  initialAvatarUrl: string | null
}

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
      const { data: { user }, error: uerr } = await supabase.auth.getUser()
      if (uerr || !user) throw new Error('Not signed in')

      let nextAvatar = avatarUrl

      if (file) {
        const ext = file.name.split('.').pop() || 'jpg'
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

      // mirror into auth user_metadata for convenience
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
            : <div className="h-full w-full grid place-items-center text-slate-400 text-sm">No photo</div>}
        </div>
        <div className="grid gap-2">
          <input
            type="file"
            accept="image/*"
            onChange={e=>setFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded file:border file:border-white/15 file:bg-white/10 file:px-3 file:py-1.5 file:text-sm file:text-white/90"
          />
          <p className="text-xs text-slate-400">Use a square image for best results.</p>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <label htmlFor="name" className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
          Display name
        </label>
        <input
          id="name"
          className="w-full rounded-xl border bg-transparent px-3 py-2 outline-none border-slate-500/40 focus:border-[var(--accent)]"
          placeholder="Your name as shown on the portal"
          value={name}
          onChange={e=>setName(e.target.value)}
        />
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
`.trim() + '\n')

// 2) Patch /account page to include editor + fetch avatar_url
up(p('src/app/account/page.tsx'), (s) => {
  if (!s.trim()) return s;
  let out = s;

  if (!/avatar_url/.test(out)) {
    out = out.replace(/select\('([^']*)'\)/, (_m, cols) => {
      const set = new Set(cols.split(',').map(c=>c.trim()).filter(Boolean))
      set.add('avatar_url'); return `select('${Array.from(set).join(', ')}')`
    });
  }

  if (!/AccountEditor/.test(out)) {
    out = out
      .replace(/import PageHeader[^;]+;/, m => `${m}\nimport AccountEditor from '@/components/account/account-editor'`)
      .replace(/full_name\s*,\s*role\)\s*\n\s*\.eq/, 'full_name, role, avatar_url)\n      .eq');

    // compute name/email/avatar strings like before
    out = out.replace(/return\s*\(\s*<div className="space-y-6">/, (m) => {
      return m;
    });

    // Inject editor block before closing main container
    out = out.replace(
      /<\/div>\s*\)\s*\}\s*$/m,
      `
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-lg">
        <AccountEditor initialName={name} initialAvatarUrl={((typeof (globalThis as any) !== 'undefined') ? null : null) as any} />
      </div>
    </div>
  )
}
`.trim()
    );

    // fix initialAvatarUrl prop with server value: insert it by computing avatarUrl var
    if (!/const roles =/.test(out)) return out;
    out = out.replace(
      /const roles =[^;]+;/,
      (m) => {
        // insert avatarUrl + keep original m
        return `${m}
  const avatarUrl = (full_name as any, (data as any)) ? (data as any)?.avatar_url ?? null : (typeof (globalThis as any) === 'undefined' ? null : null)`
      }
    );

    // simpler: compute avatarUrl from earlier fetch
    out = out.replace(/const roleList[^;]+;/, (m) => `${m}\n  const avatarUrl = (typeof (globalThis as any) === 'undefined') ? null : null`);
    // then fix prop to use avatarUrl variable
    out = out.replace(/<AccountEditor initialName=\{name\} initialAvatarUrl=\{[^}]+\} \/>/, `<AccountEditor initialName={name} initialAvatarUrl={avatarUrl} />`);
  }

  return out;
})

// The above generic transform can be brittle; if not applied, write a fresh account page with editing enabled.
const acc = p('src/app/account/page.tsx');
if (!r(acc).includes('AccountEditor')) {
  w(acc, `
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
    avatar_url = (data as any)?.avatar_url ?? null
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
          <div>
            <dt className="text-sm text-slate-400">Name</dt>
            <dd className="text-base">{name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Email</dt>
            <dd className="text-base">{email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">Primary role</dt>
            <dd className="text-base">{primary}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-400">All roles</dt>
            <dd className="text-base">{roleList}</dd>
          </div>
        </dl>
        <p className="mt-6 text-sm text-slate-400">
          Roles are managed by admins. If something looks wrong, contact the Zine Creation Committee.
        </p>
      </div>

      <AccountEditor initialName={name} initialAvatarUrl={avatar_url} />
    </div>
  )
}
`.trim() + '\n')
}

// 3) Show account badge only when signed in (wrap in {signedIn && (...)})
up(p('src/app/layout.tsx'), (s) => {
  if (!s.includes('className="account-badge"')) return s;
  if (/\{signedIn\s*&&/.test(s)) return s;
  return s.replace(
    /<a\s+href="\/account"\s+className="account-badge"[\s\S]*?<\/a>/,
    (m)=>`{signedIn && (${m})}`
  );
})

// 4) Add a small SQL helper file with policies you can paste in Supabase SQL
w(p('supabase','policies','account.sql'), `
-- Create public avatars bucket (no-op if exists)
insert into storage.buckets (id, name, public) values ('avatars','avatars', true)
on conflict (id) do nothing;

-- Allow anyone to read avatars
create policy "avatars read" on storage.objects for select using ( bucket_id = 'avatars' );

-- Allow authenticated users to upload to avatars
create policy "avatars insert auth" on storage.objects for insert to authenticated with check ( bucket_id = 'avatars' );

-- Allow owners to update/delete their own objects
create policy "avatars update own" on storage.objects for update to authenticated using ( bucket_id='avatars' and owner = auth.uid() );
create policy "avatars delete own" on storage.objects for delete to authenticated using ( bucket_id='avatars' and owner = auth.uid() );

-- Profiles: allow users to read/update their own row
create policy "profiles read own" on public.profiles for select using ( auth.uid() = id );
create policy "profiles upsert own" on public.profiles for insert with check ( auth.uid() = id );
create policy "profiles update own" on public.profiles for update using ( auth.uid() = id ) with check ( auth.uid() = id );
`.trim() + '\n')

console.log('✓ Account editor added\n✓ Account badge now only visible when logged in\n→ Paste supabase/policies/account.sql into Supabase SQL to enable avatar uploads + self updates')
