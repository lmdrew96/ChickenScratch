import fs from 'fs'; import path from 'path';
const root = process.cwd();

// 1) Copy 2.png -> public/logo.png (browser-servable)
const srcs = [
  path.join(root, '2.png'),
  '/Users/nae/Desktop/ChickenScratch/your-repo/2.png'
];
const src = srcs.find(p => { try { fs.accessSync(p); return true } catch { return false }});
if (!src) { console.error('Could not find 2.png'); process.exit(1); }
const pub = path.join(root,'public'); fs.mkdirSync(pub,{recursive:true});
const dest = path.join(pub,'logo.png');
fs.copyFileSync(src, dest);

// 2) Replace <div className="brand-badge" /> with an <img src="/logo.png" …>
function patchSidebar(file) {
  if (!fs.existsSync(file)) return false;
  let s = fs.readFileSync(file,'utf8');
  const before = s;
  s = s
    .replace(/<div\s+className="brand-badge"\s*\/>/, `<img src="/logo.png" alt="Hen & Ink logo" className="brand-badge" />`)
    .replace(/<div\s+className="brand-badge"\s*><\/div>/, `<img src="/logo.png" alt="Hen & Ink logo" className="brand-badge" />`);
  if (s !== before) { fs.writeFileSync(file,s); return true; }
  return false;
}

const sidebar = path.join(root,'src/components/shell/sidebar.tsx');
const changedSidebar = patchSidebar(sidebar);

// 3) Keep our enforcers in sync so future resets preserve the <img>
function patchGeneratorScript(file) {
  if (!fs.existsSync(file)) return false;
  let s = fs.readFileSync(file,'utf8');
  const before = s;
  s = s.replace(
    /<div className="brand-badge" \/><\/div>\s*\n\s*<div className="font-semibold">Hen &amp; Ink<\/div>/g,
    `<img src="/logo.png" alt="Hen & Ink logo" className="brand-badge" />\n        <div className="font-semibold">Hen &amp; Ink</div>`
  ).replace(
    /<div className="brand-badge"\s*\/>/g,
    `<img src="/logo.png" alt="Hen & Ink logo" className="brand-badge" />`
  );
  if (s !== before) { fs.writeFileSync(file,s); return true; }
  return false;
}

const changedEnforce = [
  path.join(root,'scripts/enforce-ui.mjs'),
  path.join(root,'scripts/brand-and-sidebar.mjs')
].map(patchGeneratorScript).some(Boolean);

console.log('✓ Copied', src, '->', dest);
console.log(changedSidebar ? '✓ Updated sidebar.tsx' : '• sidebar.tsx already uses <img>');
console.log(changedEnforce ? '✓ Updated enforcer scripts to keep <img>' : '• enforcer scripts unchanged (maybe already updated)');
