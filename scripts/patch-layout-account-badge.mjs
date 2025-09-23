import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/app/layout.tsx');
if (!fs.existsSync(file)) {
  console.error('Missing src/app/layout.tsx');
  process.exit(1);
}
let s = fs.readFileSync(file, 'utf8');
let changed = false;

// 1) Ensure import for server supabase helper
if (!/from\s+['"]@\/lib\/supabase\/server-readonly['"]/.test(s)) {
  s = s.replace(
    /(^\s*import[\s\S]*?\n)/,
    (m)=> m + `import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';\n`
  );
  changed = true;
}

// 2) Ensure RootLayout is async (so we can await)
s = s.replace(
  /export\s+default\s+function\s+RootLayout\s*\(/,
  'export default async function RootLayout('
);

// 3) Inject prelude variables + safe fetch once inside function body
if (!/const\s+signedIn\s*=/.test(s) || !/\bavatarUrl\b/.test(s) || !/\binitials\b/.test(s)) {
  s = s.replace(
    /(export\s+default\s+async\s+function\s+RootLayout\s*\([^)]*\)\s*\{\s*)/,
    `$1
  // --- injected auth prelude (idempotent) ---
  const supabase = createSupabaseServerReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  const signedIn: boolean = !!user;
  let avatarUrl: string | null = null;
  let fullName: string | undefined = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || undefined;
  try {
    if (user) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (prof?.avatar_url) avatarUrl = prof.avatar_url;
      if (prof?.full_name) fullName = prof.full_name;
    }
  } catch {}
  const initials: string =
    (fullName ?? 'User')
      .trim()
      .split(/\\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U';
  // --- end injected auth prelude ---
`
  );
  changed = true;
}

// 4) Remove any existing duplicate account badge blocks
s = s.replace(/\{signedIn[\s\S]*?className="account-badge"[\s\S]*?<\/a>\s*\)\s*\}/g, () => {
  changed = true;
  return '';
});

// 5) Insert correct badge once right after <body...>
if (!/className="account-badge"/.test(s)) {
  s = s.replace(
    /(<body[^>]*>)/,
    `$1
  {/* account badge */}
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
`
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(file, s);
  console.log('✓ Patched src/app/layout.tsx (vars + badge)');
} else {
  console.log('• layout.tsx already has vars and badge');
}
