import fs from 'fs';
import path from 'path';

const root = process.cwd();

function listLayouts(dir) {
  const out = [];
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (['.next','node_modules','.git','public'].includes(d.name)) continue;
      out.push(...listLayouts(p));
    } else if (d.isFile() && d.name === 'layout.tsx') {
      out.push(p);
    }
  }
  return out;
}

function ensureLogo() {
  const pub = path.join(root, 'public');
  fs.mkdirSync(pub, { recursive: true });
  const candidates = ['1.png','2.png'].map(n => path.join(root, n));
  const src = candidates.find(p => fs.existsSync(p));
  if (src) fs.copyFileSync(src, path.join(pub, 'logo.png'));
}

function scrubInlineNavInFile(p) {
  let s = fs.readFileSync(p, 'utf8');
  const o = s;

  const navRegexes = [
    /(?:^|\n)[^\S\r\n]*?(?:Home\s*Submit\s*My\s*Submissions\s*Published\s*Editor\s*Committee)[^\n]*\n/gi,
    /<nav[^>]*>[\s\S]*?(?:Home|Submit)[\s\S]*?<\/nav>/gi,
  ];
  navRegexes.forEach(rx => { s = s.replace(rx, '\n'); });

  s = s.replace(/<img[^>]+src=["']\/(?:logo|1|2)\.png["'][^>]*>\s*/gi, '');

  if (s !== o) {
    fs.writeFileSync(p, s);
    return true;
  }
  return false;
}

function scrubPages(dir) {
  let changed = 0;
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) {
      if (['.next','node_modules','.git','public'].includes(d.name)) continue;
      changed += scrubPages(p);
    } else if (/\.(tsx|jsx)$/.test(d.name)) {
      if (scrubInlineNavInFile(p)) changed++;
    }
  }
  return changed;
}

function rewriteNestedLayouts(layouts) {
  let changed = 0;
  for (const p of layouts) {
    if (path.normalize(p) === path.normalize(path.join(root, 'src/app/layout.tsx'))) continue;
    const passThrough = `
export default function Layout({ children }:{ children: React.ReactNode }) {
  return <>{children}</>;
}
`.trim() + '\n';
    const cur = fs.readFileSync(p, 'utf8');
    if (cur !== passThrough) {
      fs.writeFileSync(p, passThrough);
      changed++;
    }
  }
  return changed;
}

function ensureRootLayoutHasSidebar() {
  const p = path.join(root, 'src/app/layout.tsx');
  if (!fs.existsSync(p)) return false;
  let s = fs.readFileSync(p,'utf8');
  if (!s.includes("import Sidebar from '@/components/shell/sidebar'")) {
    s = s.replace(/import\s+['"]\.\/globals\.css['"];?/, "import './globals.css';\nimport Sidebar from '@/components/shell/sidebar';");
  }
  if (!s.includes('<Sidebar />') && s.includes('<body')) {
    s = s.replace(/<body[^>]*>/, m => `${m}\n        <div className="app-shell">\n          <Sidebar />\n          <main className="main">`);
    s = s.replace(/<\/body>/, '</main>\n        </div>\n      </body>');
  }
  fs.writeFileSync(p, s);
  return true;
}

ensureLogo();

const layouts = listLayouts(path.join(root, 'src/app'));
const rewrote = rewriteNestedLayouts(layouts);
const scrubbed = scrubPages(path.join(root, 'src'));
ensureRootLayoutHasSidebar();

console.log(JSON.stringify({ layoutsFound: layouts.length, nestedRewritten: rewrote, pagesScrubbed: scrubbed }, null, 2));
