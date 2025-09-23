import fs from 'fs';
import path from 'path';

const comp = path.join(process.cwd(), 'src/components/account');
const file = path.join(comp, 'account-editor.tsx');
fs.mkdirSync(comp, { recursive: true });

if (!fs.existsSync(file)) {
  fs.writeFileSync(file, `
'use client';
import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type Props = { initialFullName?: string | null; initialAvatarUrl?: string | null; };

export default function AccountEditor({ initialFullName, initialAvatarUrl }: Props) {
  const supabase = createClientComponentClient();
  const [name, setName] = useState(initialFullName ?? '');
  const [avatar, setAvatar] = useState(initialAvatarUrl ?? '');
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      let avatar_url = avatar;
      if (avatar && avatar.startsWith('data:')) {
        const b = await fetch(avatar).then(r=>r.blob());
        const key = \`\${user.id}/\${Date.now()}.png\`;
        const up = await supabase.storage.from('avatars').upload(key, b, { upsert: true, contentType: 'image/png' });
        if (up.error) throw up.error;
        const { data: pub } = supabase.storage.from('avatars').getPublicUrl(key);
        avatar_url = pub.publicUrl;
      }
      const up = await supabase.from('profiles').upsert({ id: user.id, full_name: name || null, avatar_url: avatar_url || null }, { onConflict: 'id' });
      if (up.error) throw up.error;
      alert('Saved');
    } catch (e:any) {
      alert(e.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={save} className="grid gap-4 max-w-lg">
      <label className="grid gap-1">
        <span className="text-sm opacity-80">Full name</span>
        <input value={name} onChange={e=>setName(e.target.value)} className="rounded-lg border px-3 py-2 bg-transparent" />
      </label>
      <label className="grid gap-1">
        <span className="text-sm opacity-80">Avatar URL or paste Data URL</span>
        <input value={avatar} onChange={e=>setAvatar(e.target.value)} className="rounded-lg border px-3 py-2 bg-transparent" placeholder="https://... or data:image/png;base64,..." />
      </label>
      <button type="submit" disabled={busy} className="btn btn-accent w-max">{busy ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
  `.trim());
  console.log('✓ Created src/components/account/account-editor.tsx');
} else {
  console.log('• AccountEditor already exists');
}

const page = path.join(process.cwd(), 'src/app/account/page.tsx');
if (fs.existsSync(page)) {
  let s = fs.readFileSync(page, 'utf8');
  if (!/from\s+['"]@\/components\/account\/account-editor['"]/.test(s)) {
    s = s.replace(/^/m, `import AccountEditor from '@/components/account/account-editor';\n`);
  }
  if (!/createSupabaseServerReadOnlyClient/.test(s)) {
    s = s.replace(/^/m, `import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';\n`);
  }
  if (!/redirect\s*from\s*['"]next\/navigation['"]/.test(s)) {
    s = s.replace(/^/m, `import { redirect } from 'next/navigation';\n`);
  }
  if (!/export\s+default\s+async\s+function\s+AccountPage/.test(s)) {
    s = `
export default async function AccountPage() {
  const supabase = createSupabaseServerReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/account');
  const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle();
  return (
    <>
      <h1 className="text-2xl font-semibold">Your account</h1>
      <p className="text-sm opacity-80 mb-4">Update your name and profile picture.</p>
      <AccountEditor initialFullName={prof?.full_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? ''} initialAvatarUrl={prof?.avatar_url ?? null} />
    </>
  );
}
`.trim();
  }
  fs.writeFileSync(page, s);
  console.log('✓ Wired /account to use AccountEditor and auth');
} else {
  console.log('• Skipped: src/app/account/page.tsx not found');
}
