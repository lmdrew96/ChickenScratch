import fs from 'fs'; import path from 'path';
const root = process.cwd();

function write(file, contents){ fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file,contents); }
function exists(p){ try{ fs.accessSync(p); return true }catch{ return false } }

// 1) Enforce brand colors + shell styles
const cssPath = path.join(root,'src/app/globals.css');
const brandBlockStart = '/* BRAND SHELL START */';
const brandBlockEnd   = '/* BRAND SHELL END */';
const brandCSS = `
${brandBlockStart}
:root{--brand:#00539f;--accent:#ffd200;--bg:#0b1220;--text:#e5e7eb}
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;background:var(--bg);color:var(--text);font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji"}
a{color:#cbd5e1;text-decoration:none}
a:hover{text-decoration:underline}
.app-shell{display:grid;grid-template-columns:280px 1fr;min-height:100vh}
.sidebar{position:sticky;top:0;height:100dvh;background:var(--brand);color:#fff;padding:16px}
.brand{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.brand-badge{width:40px;height:40px;border-radius:12px;display:block;object-fit:contain;background:none}
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
${brandBlockEnd}
`.trim()+"\n";

if (!exists(cssPath)) {
  write(cssPath, brandCSS);
} else {
  let css = fs.readFileSync(cssPath,'utf8');
  const s = css.indexOf(brandBlockStart), e = css.indexOf(brandBlockEnd);
  if (s !== -1 && e !== -1 && e > s) {
    const before = css.slice(0, s);
    const after = css.slice(e + brandBlockEnd.length);
    css = before + brandCSS + after;
  } else {
    css += (css.endsWith('\n') ? '' : '\n') + brandCSS;
  }
  fs.writeFileSync(cssPath, css);
}

// 2) Root layout that mounts the sidebar
const layoutPath = path.join(root,'src/app/layout.tsx');
const layoutTSX = `
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
write(layoutPath, layoutTSX);

// 3) Sidebar component
const sidebarPath = path.join(root,'src/components/shell/sidebar.tsx');
const sidebarTSX = `
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Sidebar() {
  const pathname = usePathname()
  const is = (href: string) => pathname === href
  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo.png" alt="Hen & Ink logo" className="brand-badge" />
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
write(sidebarPath, sidebarTSX);

// 4) Prevent nested layouts from masking the root shell
function allLayouts(dir){
  const out=[]; for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) out.push(...allLayouts(p));
    else if(e.isFile() && e.name==='layout.tsx') out.push(p);
  } return out;
}
const appDir = path.join(root,'src/app');
if (exists(appDir)) {
  const layouts = allLayouts(appDir).filter(p=>p!==layoutPath);
  for (const p of layouts) {
    const disabled = p + '.disabled';
    if (!exists(disabled)) try { fs.renameSync(p, disabled); } catch {}
  }
}

// 5) Ensure logo is present
const pub = path.join(root,'public'); fs.mkdirSync(pub,{recursive:true});
const logo = path.join(pub,'logo.png');
if (!exists(logo)) {
  const cand = [path.join(root,'1.png'), path.join(root,'2.png')].find(exists);
  if (cand) fs.copyFileSync(cand, logo);
}

console.log('✓ Brand colors and sidebar enforced');
