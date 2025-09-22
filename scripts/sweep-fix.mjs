import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const APPLY = process.argv.includes('--apply');
const root = process.cwd();

function log(step, msg) {
  console.log(`${APPLY ? '✍️' : '🔎'} ${step}: ${msg}`);
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
}

async function readIfExists(p) {
  try { return await fsp.readFile(p, 'utf8'); } catch { return null; }
}

async function writeFile(target, content) {
  if (!APPLY) { log('DRY', `Would write ${path.relative(root, target)} (${content.length} bytes)`); return; }
  await ensureDir(path.dirname(target));
  await fsp.writeFile(target, content, 'utf8');
  log('WRITE', path.relative(root, target));
}

function replaceAll(src, search, replace) {
  return src.split(search).join(replace);
}

async function patchFile(target, mutator) {
  const abs = path.join(root, target);
  const before = await readIfExists(abs);
  if (before == null) return { skipped: true, reason: 'missing' };
  const after = await mutator(before);
  if (after === before) return { skipped: true, reason: 'nochange' };
  await writeFile(abs, after);
  return { changed: true };
}

async function ensureProviders() {
  const providersPath = 'src/app/providers.tsx';
  const content = `\
'use client';
import React from 'react';
import { SupabaseProvider } from '@/components/providers/supabase-provider';
import Toaster from '@/components/ui/toast';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseProvider>
      {children}
      <Toaster />
    </SupabaseProvider>
  );
}
`;
  await writeFile(path.join(root, providersPath), content);
}

async function patchLayout() {
  const layoutPath = 'src/app/layout.tsx';
  const abs = path.join(root, layoutPath);
  let src = await readIfExists(abs);
  if (!src) {
    src = `\
import './globals.css';
import type { Metadata } from 'next';
import Providers from './providers';

export const metadata: Metadata = { title: 'Chicken Scratch', description: 'Student zine submissions portal' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body><Providers>{children}</Providers></body></html>
  );
}
`;
    await writeFile(abs, src);
    return;
  }
  let out = src;

  if (!/globals\.css/.test(out)) {
    out = `import './globals.css';\n` + out;
  }
  if (!/from\s+['"]\.\/providers['"]/.test(out)) {
    out = `import Providers from './providers';\n` + out;
  }
  if (!/<Providers>.*{children}.*<\/Providers>/s.test(out)) {
    out = out.replace(
      /(<body[^>]*>)([\s\S]*?){children}([\s\S]*?)(<\/body>)/,
      (_m, a, b, c, d) => `${a}${b}<Providers>{children}</Providers>${c}${d}`
    );
  }
  await writeFile(abs, out);
}

async function stripGlobalCssInComponents() {
  const compDir = path.join(root, 'src/components');
  if (!fs.existsSync(compDir)) return;
  const exts = ['.ts', '.tsx', '.js', '.jsx'];
  const files = [];
  function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (exts.includes(path.extname(p))) files.push(p);
    }
  }
  walk(compDir);
  for (const file of files) {
    const before = await fsp.readFile(file, 'utf8');
    const after = before.replace(/^\s*import\s+['"][.\/]+globals\.css['"];?\s*$/gm, '');
    if (after !== before) await writeFile(file, after);
  }
}

async function normalizeToast() {
  const toastPath = 'src/components/ui/toast.tsx';
  const abs = path.join(root, toastPath);
  const exists = fs.existsSync(abs);
  const code = `\
'use client';
import * as React from 'react';

type Toast = { id: string; title?: string; description?: string };
type ToastContextValue = {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <Toaster/>');
  return ctx;
}

export default function Toaster({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const push = (t: Omit<Toast, 'id'>) =>
    setToasts((xs) => [...xs, { ...t, id: crypto.randomUUID() }]);
  const dismiss = (id: string) =>
    setToasts((xs) => xs.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toasts, push, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className="rounded bg-black/80 text-white p-3 max-w-sm">
            {t.title ? <div className="font-medium">{t.title}</div> : null}
            {t.description ? <div className="text-sm">{t.description}</div> : null}
            <button className="text-xs underline mt-1" onClick={() => dismiss(t.id)}>
              dismiss
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
`;
  if (!exists) {
    await writeFile(abs, code);
    return;
  }
  const src = await fsp.readFile(abs, 'utf8');
  if (/export\s+default\s+useToast/.test(src) || /Duplicate export 'default'/.test(src)) {
    await writeFile(abs, code);
    return;
  }
  if (!/export\s+function\s+useToast/.test(src) || /export\s+default\s+useToast/.test(src)) {
    await writeFile(abs, code);
  }
}

async function ensureErrorBoundaries() {
  const localError = `\
'use client';
export default function Error({ error }: { error: Error & { digest?: string } }) {
  return (
    <div style={{ padding: 24 }}>
      <h1>Something went wrong</h1>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
    </div>
  );
}
`;
  const globalError = `\
'use client';
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body>
        <h1>App Error</h1>
        <pre style={{ whiteSpace: 'pre-wrap' }}>{error.message}</pre>
      </body>
    </html>
  );
}
`;
  await writeFile(path.join(root, 'src/app/error.tsx'), localError);
  await writeFile(path.join(root, 'src/app/global-error.tsx'), globalError);
}

async function ensureSmokeScript() {
  const smoke = `\
import { readFile } from 'node:fs/promises';
import http from 'node:http';

function get(path) {
  return new Promise((resolve) => {
    const req = http.get({ host: 'localhost', port: 3000, path }, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ path, status: res.statusCode, body: buf.slice(0, 500) }));
    });
    req.on('error', (e) => resolve({ path, status: 0, body: String(e) }));
  });
}

const manifestPaths = [
  '.next/server/app-paths-manifest.json',
  '.next/server/app-paths-manifest-edge.json'
];

let manifest;
for (const p of manifestPaths) {
  try { manifest = JSON.parse(await readFile(p, 'utf8')); break; } catch {}
}
if (!manifest) {
  console.error('No app-paths-manifest found. Start dev or build first (pnpm dev).');
  process.exit(1);
}

const routes = Object.keys(manifest).map((r) => r.replace(/\\/page$/, '') || '/');
const unique = [...new Set(routes)];
const results = await Promise.all(unique.map((r) => get(r)));
const bad = results.filter((x) => !(x.status >= 200 && x.status < 300));

if (bad.length === 0) { console.log('All routes returned 2xx 🎉'); process.exit(0); }
console.log('Routes with problems:');
for (const b of bad) {
  console.log(\`\${b.status} \${b.path}\`);
  console.log(b.body);
  console.log('---');
}
process.exit(2);
`;
  await writeFile(path.join(root, 'scripts/smoke.mjs'), smoke);
}

async function fixUseToastImports() {
  const srcDir = path.join(root, 'src');
  if (!fs.existsSync(srcDir)) return;
  const files = [];
  function walk(d) {
    for (const name of fs.readdirSync(d)) {
      const p = path.join(d, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (/\.(ts|tsx|js|jsx)$/.test(name)) files.push(p);
    }
  }
  walk(srcDir);
  for (const file of files) {
    let before = await fsp.readFile(file, 'utf8');
    const pattern = /import\s+useToast\s+from\s+['"]@\/components\/ui\/toast['"]/g;
    if (pattern.test(before)) {
      const after = before.replace(pattern, 'import { useToast } from "@/components/ui/toast"');
      await writeFile(file, after);
    }
  }
}

async function ensurePkgScript() {
  const pkgPath = path.join(root, 'package.json');
  const json = await readIfExists(pkgPath);
  if (!json) return;
  const pkg = JSON.parse(json);
  pkg.scripts = pkg.scripts || {};
  if (!pkg.scripts.smoke) pkg.scripts.smoke = 'node scripts/smoke.mjs';
  const out = JSON.stringify(pkg, null, 2) + '\n';
  await writeFile(pkgPath, out);
}

async function main() {
  log('START', `sweep-fix ${APPLY ? '(apply)' : '(dry-run)'}`);
  await ensureProviders();
  await patchLayout();
  await stripGlobalCssInComponents();
  await normalizeToast();
  await ensureErrorBoundaries();
  await ensureSmokeScript();
  await fixUseToastImports();
  await ensurePkgScript();
  log('DONE', 'Sweep complete.');
}
main().catch((e) => { console.error(e); process.exit(1); });
