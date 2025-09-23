import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const APP = path.join(ROOT, 'src', 'app');
const exts = ['.tsx', '.jsx', '.ts', '.js'];

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function isPageFile(p) {
  if (!exts.includes(path.extname(p))) return false;
  if (!/[/\\]page\.(tsx|jsx|ts|js)$/.test(p)) return false;
  if (p.split(path.sep).includes('api')) return false;
  return true;
}

function routeFromFile(file) {
  // src/app/(group)/published/[id]/page.tsx -> /published/[id]
  const parts = file.split(path.sep);
  const appIdx = parts.indexOf('app');
  const segs = parts.slice(appIdx + 1, -1) // drop 'page.ext'
    .filter(s => !/^\(.*\)$/.test(s)); // drop route groups
  return '/' + segs.join('/');
}

function titleCase(raw) {
  const small = new Set(['a','an','and','as','at','but','by','for','in','of','on','or','the','to','via','with']);
  const words = String(raw).replace(/[-_]+/g,' ').trim().split(/\s+/);
  return words.map((w,i)=> {
    const low = w.toLowerCase();
    if (i !== 0 && small.has(low)) return low;
    return low.charAt(0).toUpperCase() + low.slice(1);
  }).join(' ');
}

function defaultTitleForRoute(route) {
  if (route === '/' || route === '') return 'Home';
  if (route === '/published/[id]') return 'Published piece';
  const last = route.split('/').filter(Boolean).pop() || 'Page';
  return titleCase(last);
}

function inferTitleFromH1(src) {
  const m = src.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  if (!m) return null;
  // strip inner tags crudely
  return titleCase(m[1].replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim());
}

function ensureImport(src) {
  if (src.includes("@/components/shell/page-header")) return src;
  const lines = src.split('\n');
  let lastImport = -1;
  for (let i=0;i<lines.length;i++){
    if (/^\s*import\s.+from\s+['"].+['"]\s*;?\s*$/.test(lines[i])) lastImport=i;
  }
  const imp = `import PageHeader from '@/components/shell/page-header';`;
  if (lastImport >= 0) {
    lines.splice(lastImport+1, 0, imp);
    return lines.join('\n');
  }
  // no imports? inject at top
  return imp + '\n' + src;
}

function insertHeader(src, headerJSX) {
  if (src.includes('<PageHeader ')) return src; // already present
  // Replace first <h1>…</h1> if present
  if (/<h1[^>]*>[\s\S]*?<\/h1>/.test(src)) {
    return src.replace(/<h1[^>]*>[\s\S]*?<\/h1>/, headerJSX);
  }
  // Otherwise, inject right after the first "return ("
  const idx = src.search(/return\s*\(\s*/);
  if (idx !== -1) {
    return src.replace(/return\s*\(\s*/, match => match + '\n    ' + headerJSX + '\n    ');
  }
  // Fallback: append near end (very rare)
  return src + '\n' + headerJSX + '\n';
}

function headerForRoute(route, title) {
  // Special CTA for /mine
  if (route === '/mine') {
    return `<PageHeader title="${title}" ctaHref="/submit" ctaLabel="Submit new" />`;
  }
  return `<PageHeader title="${title}" />`;
}

const files = walk(APP).filter(isPageFile);
let changed = 0;

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8');
  const route = routeFromFile(file);
  const inferred = inferTitleFromH1(src);
  const title = inferred || defaultTitleForRoute(route);
  const headerJSX = headerForRoute(route, title);

  const withImport = ensureImport(src);
  const withHeader = insertHeader(withImport, headerJSX);

  if (withHeader !== src) {
    fs.writeFileSync(file, withHeader);
    changed++;
    console.log('patched', path.relative(ROOT, file), '→', `"${title}"`);
  } else {
    console.log('unchanged', path.relative(ROOT, file));
  }
}

console.log(`\nDone. Updated ${changed} page(s).`);
