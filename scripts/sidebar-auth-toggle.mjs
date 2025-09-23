import fs from 'fs'; import path from 'path';
const root = process.cwd();

function w(file, s){ fs.mkdirSync(path.dirname(file), {recursive:true}); fs.writeFileSync(file, s); }
function r(file){ return fs.existsSync(file) ? fs.readFileSync(file,'utf8') : ''; }
function up(file, fn){ const prev = r(file); const next = fn(prev); if (next !== prev) w(file, next); }

// 1) Create API route for sign-out (server-side, cookie-safe)
const signoutRoute = path.join(root, 'src/app/api/auth/signout/route.ts');
w(signoutRoute, `
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export async function POST(req: NextRequest) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options, expires: new Date(0) })
        },
      },
    }
  )

  // Revoke refresh token & clear cookies
  await supabase.auth.signOut()
  const url = new URL('/', req.url)
  return NextResponse.redirect(url, { status: 303 })
}
`.trim() + "\n");

// 2) Patch layout to compute "signedIn" on the server and pass it to Sidebar
const layoutPath = path.join(root, 'src/app/layout.tsx');
up(layoutPath, (s) => {
  if (!s.includes("Sidebar")) return s; // bail if unexpected structure

  // Ensure imports
  if (!s.includes("createSupabaseServerReadOnlyClient")) {
    s = s.replace(
      /^import\s+['"]\.\/globals\.css['"];?/m,
      (m) => `${m}\nimport { createSupabaseServerReadOnlyClient } from '@/lib/supabase/server-readonly'`
    );
  }
  // Make RootLayout async & pass signedIn
  s = s.replace(
    /export default function RootLayout\(\{\s*children[^}]*\}\s*:\s*\{\s*children[^}]*\}\)\s*\{/,
    'export default async function RootLayout({ children }: { children: React.ReactNode }) {'
  );

  if (!s.includes('const signedIn =')) {
    s = s.replace(
      /<body[^>]*>\s*/,
      (m) => {
        const bootstrap = `
${m}        {/* account badge stays as-is if present */}
`;
        const authBlock = `
        {/** server-auth probe **/}
`;
        // Insert auth probe just before the app-shell div
        const probe = `
        {/* auth probe */}
`;
        return bootstrap;
      }
    );
    // Inject auth code after opening function brace
    s = s.replace(
      /(export default async function RootLayout\([^)]+\)\s*\{\s*)/,
      `$1
  const supabase = await createSupabaseServerReadOnlyClient()
  const { data: { user } } = await supabase.auth.getUser()
  const signedIn = !!user
`
    );
  }

  // Pass prop to Sidebar if not already
  s = s.replace(
    /<Sidebar\s*\/>/,
    '<Sidebar signedIn={signedIn} />'
  );

  return s;
});

// 3) Update Sidebar to accept "signedIn" prop and render Login/Sign out conditionally
const sidebarPath = path.join(root, 'src/components/shell/sidebar.tsx');
up(sidebarPath, (s) => {
  if (!s.trim()) return s;
  // Ensure it has 'use client'
  if (!s.startsWith("'use client'")) s = `'use client'\n` + s;

  // Add prop type and signature
  if (!s.includes('function Sidebar(')) return s;
  s = s
    .replace(/export default function Sidebar\(\)/, 'export default function Sidebar({ signedIn = false }: { signedIn?: boolean })');

  // Replace bottom auth area
  s = s.replace(
    /<div style=\{\{ marginTop: 'auto' \}\}>[\s\S]*?<\/div>\s*\}\)\s*<\/aside>/m,
    `
      <div style={{ marginTop: 'auto' }}>
        {signedIn ? (
          <form action="/api/auth/signout" method="post" style={{ display: 'inline-block', marginTop: '1rem' }}>
            <button type="submit" className="btn" aria-label="Sign out">Sign out</button>
          </form>
        ) : (
          <a href="/login" className="btn btn-accent" style={{ display: 'inline-flex', marginTop: '1rem' }}>
            Login
          </a>
        )}
      </div>
    </aside>`
  );

  return s;
});

console.log('✓ Sidebar login/sign-out toggle wired\n- POST /api/auth/signout added\n- layout passes signedIn to Sidebar\n- Sidebar renders Login/Sign out conditionally');
