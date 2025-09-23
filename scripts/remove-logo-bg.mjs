import fs from 'fs'; import path from 'path';

const root = process.cwd();
const files = [
  path.join(root, 'src/app/globals.css'),
  path.join(root, 'scripts/enforce-ui.mjs'),
  path.join(root, 'scripts/brand-and-sidebar.mjs'),
];

// Replace any `.brand-badge { … }` block with a neutral, no-background version
const NEW_BLOCK = `.brand-badge{width:40px;height:40px;border-radius:12px;display:block;object-fit:contain;background:none}`;

function replaceBrandBadgeBlock(text) {
  const re = /\.brand-badge\s*\{[\s\S]*?\}/g;
  if (!re.test(text)) return text;
  return text.replace(re, NEW_BLOCK);
}

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let s = fs.readFileSync(f, 'utf8');
  const before = s;

  // For .mjs generators, patch inside template literals too.
  s = s.replace(/(`[^`]*?)(\.brand-badge\s*\{[\s\S]*?\})([^`]*?`)/g,
    (_m, pre, block, post) => pre + NEW_BLOCK + post);

  // And patch any raw CSS occurrences (e.g., globals.css)
  s = replaceBrandBadgeBlock(s);

  if (s !== before) {
    fs.writeFileSync(f, s);
    console.log('✓ Patched', path.relative(root, f));
  } else {
    console.log('• No change needed', path.relative(root, f));
  }
}

// If sidebar still uses a div brand-badge (older state), ensure it's an <img>
const sidebar = path.join(root, 'src/components/shell/sidebar.tsx');
if (fs.existsSync(sidebar)) {
  let s = fs.readFileSync(sidebar, 'utf8');
  const before = s;
  s = s
    .replace(/<div\s+className="brand-badge"\s*\/>/g, `<img src="/logo.png" alt="Hen & Ink logo" className="brand-badge" />`)
    .replace(/<div\s+className="brand-badge"\s*><\/div>/g, `<img src="/logo.png" alt="Hen & Ink logo" className="brand-badge" />`);
  if (s !== before) {
    fs.writeFileSync(sidebar, s);
    console.log('✓ Ensured <img> logo in sidebar.tsx');
  } else {
    console.log('• Sidebar already uses <img>');
  }
}

console.log('Done. If styles were cached, restart dev or hard-refresh.');
