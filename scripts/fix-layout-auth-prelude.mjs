import fs from 'fs';
import path from 'path';

const file = path.join(process.cwd(), 'src/app/layout.tsx');
let s = fs.readFileSync(file, 'utf8');
let changed = false;

// 1) Ensure we import the server-readonly Supabase client
if (!s.includes("createSupabaseServerReadOnlyClient")) {
  s = s.replace(
    /(^\s*import .+\n)(?![\s\S]*createSupabaseServerReadOnlyClient)/,
    (m) => m + `import { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly';\n`
  );
  changed = true;
}

// 2) Inject an auth prelude inside RootLayout before the return()
const prelude = `
  // --- auth prelude for sidebar + account badge ---
  const supabase = createSupabaseServerReadOnlyClient();
  const { data: { user } } = await supabase.auth.getUser();
  const signedIn = !!user;

  let avatarUrl = null;
  let fullName = undefined;

  if (user) {
    fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email || undefined;
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();
      if (prof?.avatar_url) avatarUrl = prof.avatar_url;
      if (prof?.full_name) fullName = prof.full_name;
    } catch (_) { /* ignore */ }
  }

  const initials = (fullName ?? 'User')
    .trim()
    .split(/\\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase())
    .join('') || 'U';
  // --- end auth prelude ---
`.trim() + '\n';

if (!/const\s+signedIn\s*=/.test(s)) {
  // find start of RootLayout function body
  s = s.replace(
    /(export\s+default\s+async\s+function\s+RootLayout\s*\([^)]*\)\s*\{\s*)/,
    `$1${prelude}`
  );
  changed = true;
}

// 3) Make sure the account badge block is well-formed (in case of earlier edits)
const correctBadge = `
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
`.trim();

if (s.includes('className="account-badge"')) {
  // Normalize any previously broken double-wrapped conditionals
  s = s.replace(/\{signedIn\s*&&\s*\(\s*\{signedIn[\s\S]*?<\/a>\s*\)\}\)\}/, correctBadge);
  // If there is another malformed block, replace anything between badge comment and next .app-shell
  s = s.replace(
    /(\/\*+\s*account badge[\s\S]*?\*\/\s*)([\s\S]*?)(\n\s*<div className="app-shell">)/,
    `$1${correctBadge}$3`
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(file, s);
  console.log('✓ Updated src/app/layout.tsx with auth prelude and fixed badge.');
} else {
  console.log('• No changes needed.');
}
