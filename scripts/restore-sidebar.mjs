import fs from 'fs';
import path from 'path';

const root = process.cwd();
const write = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); console.log('✓ wrote', p); };
const exist = (p) => fs.existsSync(p);
const read  = (p) => fs.readFileSync(p, 'utf8');

// 1) Theme with .app-shell/.sidebar + brand colors
const themeCss = `
:root{
  --brand:#00539f;
  --accent:#ffd200;
  --bg:#0b1220;
  --panel:#0f172a;
  --line:rgba(255,255,255,.12);
  --text:#e5e7eb;
  --muted:#94a3b8;
}
html,body{height:100%}
body{background:var(--bg);color:var(--text)}
.app-shell{min-height:100vh;display:grid;grid-template-columns:18rem 1fr}
.sidebar{position:sticky;top:0;height:100vh;background:var(--brand);color:#001b33;border-right:1px solid rgba(0,0,0,.25);padding:1rem}
.sidebar .brand{display:flex;align-items:center;gap:.75rem;margin-bottom:1rem}
.sidebar .brand-badge{display:grid;place-items:center;height:40px;width:40px;border-radius:.6rem;background:var(--accent);color:#001b33;overflow:hidden}
.sidebar nav a{display:flex;align-items:center;gap:.6rem;padding:.6rem .8rem;border-radius:.6rem;color:#001b33}
.sidebar nav a.active{background:rgba(255,255,255,.2)}
.main{padding:1.25rem}
.card,.form-card{background:var(--panel);border:1px solid var(--line);border-radius:1rem}
.btn-accent{background:var(--accent);border-color:#cca800;color:#0b1220}
.btn-brand{background:var(--brand);border-color:#0b1220;color:#fff}
.pill--active{background:var(--accent);border-color:#cca800;color:#00539f}
h1,h2,h3{color:#fff}
a{color:#cbd5e1}
`;

write(path.join(root, 'src/app/theme.css'), themeCss);

// 2) Ensure globals.css imports tailwind v4 and the theme
const globalsPath = path.join(root, 'src/app/globals.css');
let globals = exist(globalsPath) ? read(globalsPath) : '';
if (!/^\s*@import\s+"tailwindcss";/m.test(globals)) globals = `@import "tailwindcss";\n` + globals;
if (!/^\s*@import\s+".\/theme.css";/m.test(globals)) globals = globals.replace(/(@import\s+"tailwindcss";\s*\n?)/, `$1@import "./theme.css";\n`);
write(globalsPath, globals);

// 3) Sidebar component (logo + links)
const sidebarTsx = `
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Home' },
  { href: '/submit', label: 'Submit' },
  { href: '/mine', label: 'My Submissions' },
  { href: '/published', label: 'Published' },
  { href: '/editor', label: 'Editor' },
  { href: '/committee', label: 'Committee' },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-badge">
          <img src="/logo.png" alt="Hen & Ink" style={{height: '100%', width: '100%', objectFit:'cover'}} onError={(e)=>{(e.currentTarget as HTMLImageElement).style.display='none'}}/>
        </div>
        <div className="font-semibold">Hen &amp; Ink</div>
      </div>
      <nav className="grid gap-1">
        {links.map(l => {
          const active = pathname === l.href;
          return (
            <Link key={l.href} href={l.href} className={active ? 'active' : ''}>
              {l.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
`;
write(path.join(root, 'src/components/shell/sidebar.tsx'), sidebarTsx);

// 4) Put sidebar into a clean layout shell
const layoutTsx = `
import './globals.css';
import type { Metadata } from 'next';
import Sidebar from '@/components/shell/sidebar';

export const metadata: Metadata = {
  title: 'Hen & Ink Portal',
  description: 'Submission portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[--bg] text-[--text]">
        <style
          id="brand-inline-theme"
          dangerouslySetInnerHTML={{ __html:
            ":root{--brand:#00539f;--accent:#ffd200;--bg:#0b1220;--text:#e5e7eb} body{background:var(--bg);color:var(--text)} a{color:#cbd5e1}" }}
        />
        <div className="app-shell">
          <Sidebar />
          <div className="main">{children}</div>
        </div>
      </body>
    </html>
  );
}
`;
write(path.join(root, 'src/app/layout.tsx'), layoutTsx);

// 5) Remove old floating/top nav usage so it doesn't conflict
function replaceIn(file, re, repl){
  if (!exist(file)) return;
  const s = read(file);
  const t = s.replace(re, repl);
  if (t !== s) { write(file, t); }
}
const srcDir = path.join(root, 'src');
function walk(dir){
  for (const d of fs.readdirSync(dir, { withFileTypes:true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (['.next','node_modules','.git'].includes(d.name)) continue;
      walk(p);
    } else if (/\.(tsx?|jsx?)$/.test(d.name)) {
      replaceIn(p, /<SiteNav\s*\/>\s*/g, '');
      replaceIn(p, /import\s+SiteNav\s+from\s+['"][^'"]+['"]\s*;?\s*/g, '');
    }
  }
}
if (exist(srcDir)) walk(srcDir);

// 6) Ensure @ alias
const tsCfg = path.join(root, 'tsconfig.json');
if (exist(tsCfg)) {
  const j = JSON.parse(read(tsCfg));
  j.compilerOptions ??= {};
  j.compilerOptions.baseUrl ??= '.';
  j.compilerOptions.paths ??= {};
  j.compilerOptions.paths['@/*'] = ['src/*'];
  write(tsCfg, JSON.stringify(j, null, 2));
}

// 7) Copy a logo into public/
const pub = path.join(root, 'public');
fs.mkdirSync(pub, { recursive:true });
const cands = ['1.png','2.png'].map(n => path.join(root, n));
const found = cands.find(p => exist(p));
if (found) {
  fs.copyFileSync(found, path.join(pub, 'logo.png'));
  console.log('✓ logo:', path.basename(found), '→ public/logo.png');
} else if (!exist(path.join(pub, 'logo.svg'))) {
  const svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="100%" height="100%" fill="#ffd200"/><text x="50%" y="55%" text-anchor="middle" font-size="48" font-family="sans-serif" fill="#00539f">HI</text></svg>\`;
  fs.writeFileSync(path.join(pub, 'logo.svg'), svg);
  console.log('• placeholder public/logo.svg created');
}

console.log('All set. Rebuild the app.');
