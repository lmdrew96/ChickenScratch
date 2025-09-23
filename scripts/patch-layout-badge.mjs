import fs from 'fs'; import path from 'path';
const file = path.join(process.cwd(), 'src/app/layout.tsx');
let s = fs.readFileSync(file, 'utf8');

const correct = `
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

let changed = false;

// Fix the exact doubled pattern: {signedIn && ({signedIn && ( ... )})}
s = s.replace(/\{signedIn\s*&&\s*\(\s*\{signedIn[\s\S]*?<\/a>\s*\)\}\)\}/, correct + '\n');
if (s !== fs.readFileSync(file, 'utf8')) changed = true;

// If still broken, try replacing anything between the “account badge” comment and the next app-shell div.
if (!changed && s.includes('account badge') && s.includes('<div className="app-shell">')) {
  s = s.replace(
    /(\/\*+\s*account badge[\s\S]*?\*\/\s*)([\s\S]*?)(\n\s*<div className="app-shell">)/,
    `$1${correct}$3`
  );
  changed = true;
}

// As a last resort, inject the correct block right after <body> if we see neither form present.
if (!changed && /<body[^>]*>/.test(s) && !/className="account-badge"/.test(s)) {
  s = s.replace(/(<body[^>]*>)/, `$1\n${correct}\n`);
  changed = true;
}

if (!changed) {
  console.log('• No changes made (pattern not found or already fixed).');
} else {
  fs.writeFileSync(file, s);
  console.log('✓ Fixed account badge JSX in src/app/layout.tsx');
}
