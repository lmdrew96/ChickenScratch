import fs from 'fs'; import path from 'path';
const root = process.cwd();

function w(file, contents){ fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,contents); }

const globals = `
:root{--brand:#00539f;--accent:#ffd200;--bg:#0b1220;--text:#e5e7eb}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji"}
a{color:#cbd5e1;text-decoration:none}
a:hover{text-decoration:underline}
.app-shell{display:grid;grid-template-columns:280px 1fr;min-height:100vh}
.sidebar{position:sticky;top:0;height:100dvh;background:var(--brand);color:#fff;padding:16px}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.brand-badge{width:40px;height:40px;border-radius:12px;background:var(--accent) center/cover no-repeat;background-image:url('/logo.png')}
.nav{display:grid;gap:6px}
.nav a{display:block;padding:8px 10px;border-radius:8px;color:#fff}
.nav a:hover{background:rgba(255,255,255,.12)}
.nav a.active{background:var(--accent);color:#003b72;font-weight:700}
.main{padding:24px}
.container{max-width:1100px;margin:0 auto}
.btn{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;border:1px solid rgba(255,255,255,.25)}
.btn-accent{background:var(--accent);border-color:#cca800;color:#003b72;font-weight:600}
h1{margin:0 0 8px;font-size:28px}
p{margin:0 0 12px}
`.trim()+"\n";

const layout = `
import './globals.css'
import Sidebar from '@/components/shell/sidebar'

export const metadata = { title: 'Hen & Ink Portal', description: 'Submission portal' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <main className="main">
            <div className="container">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}
`.trim()+"\n";

const sidebar = `
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()
  const is = (href: string) => pathname === href
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge" />
        <div className="font-semibold">Hen &amp; Ink</div>
      </div>
      <nav className="nav">
        <Link href="/" className={is('/') ? 'active' : ''}>Home</Link>
        <Link href="/submit" className={is('/submit') ? 'active' : ''}>Submit</Link>
        <Link href="/mine" className={is('/mine') ? 'active' : ''}>My Submissions</Link>
        <Link href="/published" className={is('/published') ? 'active' : ''}>Published</Link>
        <Link href="/editor" className={is('/editor') ? 'active' : ''}>Editor</Link>
        <Link href="/committee" className={is('/committee') ? 'active' : ''}>Committee</Link>
      </nav>
      <div style={{ marginTop: 'auto' }}>
        <Link href="/login" className="btn btn-accent" style={{ display: 'inline-flex', marginTop: '1rem' }}>
          Login
        </Link>
      </div>
    </aside>
  )
}
`.trim()+"\n";

w(path.join(root,'src/app/globals.css'), globals);
w(path.join(root,'src/app/layout.tsx'), layout);
w(path.join(root,'src/components/shell/sidebar.tsx'), sidebar);

const pub = path.join(root,'public'); fs.mkdirSync(pub,{recursive:true});
const logo = path.join(pub,'logo.png');
const candidates = [path.join(root,'1.png'), path.join(root,'2.png')];
if (!fs.existsSync(logo)) {
  const src = candidates.find(p=>fs.existsSync(p));
  if (src) fs.copyFileSync(src, logo);
}

console.log('✔ stripped to minimal shell with sidebar');
console.log('• globals.css, layout.tsx, components/shell/sidebar.tsx rewritten');
console.log(fs.existsSync(logo) ? '• logo.png present' : '• logo.png missing (drop 1.png or 2.png in repo root to auto-copy next run)');
