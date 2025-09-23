import fs from 'fs';
import path from 'path';

const root = process.cwd();
const cssPath = path.join(root, 'src/app/globals.css');
const pubDir = path.join(root, 'public');
const logo = path.join(pubDir, 'logo.png');

fs.mkdirSync(pubDir, { recursive: true });
const candidates = [path.join(root,'1.png'), path.join(root,'2.png')];
if (!fs.existsSync(logo)) {
  const src = candidates.find(p => fs.existsSync(p));
  if (src) fs.copyFileSync(src, logo);
}

const blockStart = '/* BRAND SHELL START */';
const blockEnd   = '/* BRAND SHELL END */';
const block = `
${blockStart}
:root{--brand:#00539f;--accent:#ffd200;--bg:#0b1220;--text:#e5e7eb}
.app-shell{display:grid;grid-template-columns:280px 1fr;min-height:100vh;background:var(--bg);color:var(--text)}
.sidebar{background:var(--brand);color:#fff;padding:1.25rem;position:sticky;top:0;height:100dvh}
.brand{display:flex;align-items:center;gap:.75rem;margin-bottom:1rem}
.brand-badge{width:40px;height:40px;border-radius:12px;background:var(--accent) center/cover no-repeat;background-image:url('/logo.png');box-shadow:0 1px 0 rgba(0,0,0,.15) inset}
.sidebar nav{margin-top:.25rem}
.sidebar nav a{display:block;padding:.5rem .75rem;border-radius:.5rem;color:#fff;text-decoration:none}
.sidebar nav a:hover{background:rgba(255,255,255,.12)}
.sidebar nav a.active{background:var(--accent);color:#003b72;font-weight:700}
.main{padding:2rem}
.btn{display:inline-flex;align-items:center;gap:.5rem;padding:.5rem .875rem;border-radius:.5rem;border:1px solid rgba(255,255,255,.2);text-decoration:none}
.btn-accent{background:var(--accent);border-color:#cca800;color:#003b72;font-weight:600}
.container{max-width:1200px;margin-inline:auto}
${blockEnd}
`.trim()+"\n";

if (!fs.existsSync(cssPath)) {
  fs.mkdirSync(path.dirname(cssPath), { recursive: true });
  fs.writeFileSync(cssPath, block);
  console.log('created', cssPath);
} else {
  let css = fs.readFileSync(cssPath,'utf8');
  const start = css.indexOf(blockStart);
  const end = css.indexOf(blockEnd);
  if (start !== -1 && end !== -1 && end > start) {
    const before = css.slice(0, start);
    const after = css.slice(end + blockEnd.length);
    css = before + block + after;
  } else {
    if (!css.endsWith('\n')) css += '\n';
    css += '\n' + block;
  }
  fs.writeFileSync(cssPath, css);
  console.log('updated', cssPath);
}
console.log(fs.existsSync(logo) ? 'logo: ok' : 'logo: missing (place 1.png or 2.png at repo root)');
