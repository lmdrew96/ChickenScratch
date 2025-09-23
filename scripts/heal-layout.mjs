import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/app/layout.tsx');
let s = fs.readFileSync(file, 'utf8');
let changed = false;

if (!s.includes("createSupabaseServerReadOnlyClient")) {
  s = s.replace(
    /(^\s*import[\s\S]*?\n)(?![\s\S]*createSupabaseServerReadOnlyClient)/,
    (m)=> m + `import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';\n`
  );
  changed = true;
}

const prelude = `
  const supabase = createSupabaseServerReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  const signedIn = !!user;
  let avatarUrl = null;
  let fullName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || undefined;
  try {
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', user.id).maybeSingle();
      if (prof?.avatar_url) avatarUrl = prof.avatar_url;
      if (prof?.full_name) fullName = prof.full_name;
    }
  } catch {}
  const initials = (fullName ?? 'User').trim().split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]?.toUpperCase()).join('') || 'U';
`.trim() + '\n';

if (!/const\s+signedIn\s*=/.test(s)) {
  s = s.replace(
    /(export\s+default\s+async\s+function\s+RootLayout\s*\([^)]*\)\s*\{\s*)/,
    `$1${prelude}`
  );
  changed = true;
}

const correctBadge = `
{/* account badge stays as-is if present */}{signedIn && (
  <a href="/account" className="account-badge" aria-label="Your account" style={{position:'fixed',top:'1rem',right:'1rem',zIndex:50}}>
    <span className="sr-only">Your account</span>
    {avatarUrl ? (
      <img src={avatarUrl || ''} alt="" className="h-8 w-8 rounded-full ring-2 ring-[--accent] object-cover" />
    ) : (
      <span className="h-8 w-8 rounded-full grid place-items-center font-semibold bg-[--accent] text-[--brand]">{initials}</span>
    )}
  </a>
)}
`.trim();

s = s.replace(
  /\{\s*\/\*[^]*?account badge[^]*?\*\/\s*(?=\{signedIn)/,
  '{/* account badge stays as-is if present */}'
);

if (s.includes('className="account-badge"')) {
  s = s.replace(/\{signedIn[\s\S]*?className="account-badge"[\s\S]*?<\/a>\s*\)\s*\}/g, '');
  changed = true;
}

if (!s.includes('className="account-badge"')) {
  s = s.replace(/(<body[^>]*>)/, `$1\n${correctBadge}\n`);
  changed = true;
}

if (changed) {
  fs.writeFileSync(file, s);
  console.log('✓ Healed src/app/layout.tsx (auth prelude + badge fixed)');
} else {
  console.log('• layout.tsx already OK');
}
