import fs from 'fs'; import path from 'path';
const root = process.cwd();
const cssFile = path.join(root,'src/app/globals.css');
const layoutFile = path.join(root,'src/app/layout.tsx');
const accountFile = path.join(root,'src/app/account/page.tsx');

function ensureDir(p){ fs.mkdirSync(path.dirname(p), { recursive: true }); }
function upsert(file, transform){
  ensureDir(file);
  let s = fs.existsSync(file) ? fs.readFileSync(file,'utf8') : '';
  const out = transform(s);
  if (out !== s) fs.writeFileSync(file, out);
}

// 1) Add badge styles to globals.css
upsert(cssFile, (s) => {
  const blockStart = '/* ACCOUNT BADGE START */';
  const blockEnd   = '/* ACCOUNT BADGE END */';
  const block = `
${blockStart}
.account-badge{position:fixed;top:12px;right:12px;z-index:60;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:9999px;background:var(--accent);color:#003b72;border:1px solid #cca800;box-shadow:0 10px 20px rgba(0,0,0,.25)}
.account-badge:hover{filter:brightness(0.97)}
.account-badge svg{width:22px;height:22px}
@media (max-width:768px){.account-badge{top:10px;right:10px}}
${blockEnd}
`.trim() + "\n";

  if (!s.includes(blockStart)) {
    return s + (s.endsWith('\n') ? '' : '\n') + block;
  }
  const start = s.indexOf(blockStart);
  const end = s.indexOf(blockEnd);
  if (start !== -1 && end !== -1 && end > start) {
    return s.slice(0, start) + block + s.slice(end + blockEnd.length);
  }
  return s;
});

// 2) Inject the badge <a> right after <body> in app/layout.tsx (idempotent)
upsert(layoutFile, (s) => {
  if (!s.trim()) {
    throw new Error('src/app/layout.tsx not found or empty');
  }
  if (s.includes('className="account-badge"')) return s; // already present
  const bodyTag = /<body([^>]*)>/;
  if (!bodyTag.test(s)) return s; // unexpected, leave untouched
  const badge = `
        <a href="/account" className="account-badge" aria-label="Account" title="Account">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 21v-1.2c0-1.68 0-2.52-.327-3.162a3 3 0 0 0-1.311-1.311C17.88 15 17.04 15 15.36 15H8.64c-1.68 0-2.52 0-3.162.327a3 3 0 0 0-1.311 1.311C4 17.28 4 18.12 4 19.8V21"/>
            <circle cx="12" cy="8" r="4"/>
          </svg>
        </a>`;
  return s.replace(bodyTag, (m) => `${m}\n${badge}`);
});

// 3) Create the protected /account page (Server Component)
ensureDir(accountFile);
if (!fs.existsSync(accountFile)) {
  fs.writeFileSync(accountFile, `
import PageHeader from '@/components/shell/page-header'
import { requireUser } from '@/lib/auth/guards'
import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly'

export const metadata = { title: 'Account' }

export default async function AccountPage() {
  const user = await requireUser('/account')
  const supabase = await createSupabaseServerReadOnlyClient()

  let full_name: string | null = null
  let primaryRole: string | null = null
  try {
    const { data } = await supabase.from('profiles')
      .select('full_name, role')
      .eq('id', user.id)
      .single()
    full_name = (data as any)?.full_name ?? null
    primaryRole = (data as any)?.role ?? null
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
    </div>
  )
}
`.trim() + "\n");
}

console.log('✓ Floating account badge added and /account page created');
