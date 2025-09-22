import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');
const root = process.cwd();
const w = async (p, s) => { if (!APPLY) return; await fsp.mkdir(path.dirname(p), {recursive:true}); await fsp.writeFile(p, s) };

async function read(p){ try { return await fsp.readFile(p,'utf8'); } catch { return null; } }
function log(x){ console.log((APPLY?'✍️':'🔎')+' '+x); }

async function ensurePkg(){
  const p = path.join(root,'package.json');
  const raw = await read(p); if (!raw) return;
  const pkg = JSON.parse(raw);
  pkg.scripts = pkg.scripts || {};
  pkg.scripts.dev ||= 'next dev -p 3000';
  pkg.scripts.build ||= 'next build';
  pkg.scripts.start ||= 'next start -p 3000';
  pkg.scripts.lint ||= 'next lint || true';
  pkg.scripts.smoke ||= 'node scripts/smoke.mjs';
  pkg.engines = pkg.engines || { node: '>=20' };
  log('package.json scripts/engines'); await w(p, JSON.stringify(pkg,null,2)+'\n');
}

async function ensureNextConfig(){
  const p = path.join(root,'next.config.mjs');
  const s = `import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  webpack: (config) => {
    config.resolve.alias = { ...(config.resolve.alias||{}), '@': path.resolve(__dirname, 'src') };
    return config;
  },
};
export default nextConfig;
`;
  log('next.config.mjs'); await w(p,s);
}

async function ensureTSPaths(){
  const p = path.join(root,'tsconfig.json');
  let raw = await read(p);
  if (!raw) raw = JSON.stringify({ compilerOptions: {} });
  const j = JSON.parse(raw);
  j.compilerOptions ||= {};
  j.compilerOptions.baseUrl = '.';
  j.compilerOptions.paths = j.compilerOptions.paths || {};
  j.compilerOptions.paths['@/*'] = ['src/*'];
  j.compilerOptions.jsx ||= 'preserve';
  j.compilerOptions.moduleResolution ||= 'bundler';
  log('tsconfig.json aliases'); await w(p, JSON.stringify(j,null,2)+'\n');
}

async function ensureTailwind(){
  const post = `export default { plugins: { "@tailwindcss/postcss": {}, autoprefixer: {} } }\n`;
  const tw = `export default { content: ["./src/**/*.{ts,tsx,js,jsx,mdx,css,html}"] }\n`;
  const css = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
  log('postcss.config.mjs'); await w(path.join(root,'postcss.config.mjs'), post);
  log('tailwind.config.ts'); await w(path.join(root,'tailwind.config.ts'), tw);
  const cssPath = path.join(root,'src/app/globals.css');
  const cur = await read(cssPath);
  if (!cur || !/@tailwind /.test(cur)) { log('src/app/globals.css'); await w(cssPath, css); }
}

async function ensureErrorBoundaries(){
  const local = `'use client';
export default function Error({ error }:{ error: Error & { digest?: string } }){
  return <div style={{padding:24}}><h1>Something went wrong</h1><pre style={{whiteSpace:'pre-wrap'}}>{error.message}</pre></div>;
}
`;
  const global = `'use client';
export default function GlobalError({ error }:{ error: Error & { digest?: string } }){
  return <html><body><h1>App Error</h1><pre style={{whiteSpace:'pre-wrap'}}>{error.message}</pre></body></html>;
}
`;
  log('src/app/error.tsx'); await w(path.join(root,'src/app/error.tsx'), local);
  log('src/app/global-error.tsx'); await w(path.join(root,'src/app/global-error.tsx'), global);
}

async function ensureProvidersAndLayout(){
  const providers = `'use client';
import React from 'react';
import Toaster from '@/components/ui/toast';
import { SupabaseProvider } from '@/components/providers/supabase-provider';
export default function Providers({ children }:{ children: React.ReactNode }){
  return <SupabaseProvider>{children}<Toaster/></SupabaseProvider>;
}
`;
  log('src/app/providers.tsx'); await w(path.join(root,'src/app/providers.tsx'), providers);

  const layoutPath = path.join(root,'src/app/layout.tsx');
  let src = await read(layoutPath);
  if (!src){
    src = `import './globals.css';
import type { Metadata } from 'next';
import Providers from './providers';
export const metadata: Metadata = { title:'Chicken Scratch', description:'Student zine submissions portal' };
export default function RootLayout({ children }:{ children: React.ReactNode }){
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
`;
  } else {
    if (!/globals\.css/.test(src)) src = `import './globals.css';\n`+src;
    if (!/from ['"]\.\/providers['"]/.test(src)) src = `import Providers from './providers';\n`+src;
    if (!/<Providers>.*{children}.*<\/Providers>/s.test(src)){
      src = src.replace(/(<body[^>]*>)([\s\S]*?)\{children\}([\s\S]*?)(<\/body>)/,
        (_m,a,b,c,d)=>`${a}${b}<Providers>{children}</Providers>${c}${d}`);
    }
  }
  log('src/app/layout.tsx'); await w(layoutPath, src);
}

async function stripRogueGlobalCss(){
  const dir = path.join(root,'src/components');
  if (!fs.existsSync(dir)) return;
  const exts = ['.ts','.tsx','.js','.jsx'];
  const files = [];
  (function walk(d){ for (const n of fs.readdirSync(d)){ const p=path.join(d,n); const st=fs.statSync(p);
    if (st.isDirectory()) walk(p); else if (exts.includes(path.extname(p))) files.push(p);
  } })(dir);
  for (const f of files){
    const s = await read(f);
    if (!s) continue;
    const out = s.replace(/^\s*import\s+['"][.\/]+globals\.css['"];?\s*$/gm,'');
    if (out !== s){ log('strip globals.css in '+path.relative(root,f)); await w(f,out); }
  }
}

async function ensureSupabaseServerHelper(){
  const p = path.join(root,'src/lib/supabase/server.ts');
  if (fs.existsSync(p)) return;
  const s = `import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
export function getSupabaseServerClient(){
  const store = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createServerClient(url, key, { cookies: {
    get(name:string){ return store.get(name)?.value; },
    set(name:string, value:string, options:any){ store.set({ name, value, ...options }); },
    remove(name:string, options:any){ store.set({ name, value:'', ...options, maxAge:0 }); },
  }});
}
export const createServerSupabaseClient = getSupabaseServerClient;
export const createSupabaseServerClient = getSupabaseServerClient;
`;
  log('src/lib/supabase/server.ts'); await w(p, s);
}

async function ensureConstantsAndBadge(){
  const constants = `export const SUBMISSION_TYPES = [
  'poetry','poem','fiction','short_story','nonfiction','essay',
  'drama','script','art','visual_art','photography','comics','comic','audio','other'
] as const;
export type SubmissionType = typeof SUBMISSION_TYPES[number];
export const SUBMISSION_STATUSES = [
  'draft','submitted','under_review','needs_revision','approved',
  'not_started','content_review','copy_edit','layout','ready_to_publish','published','declined','withdrawn'
] as const;
export type SubmissionStatus = typeof SUBMISSION_STATUSES[number];
export const EDITABLE_STATUSES: SubmissionStatus[] = ['draft','needs_revision','declined'];
export function formatStatus(s:string):string{
  const map:Record<string,string> = {
    draft:'Draft',submitted:'Submitted',under_review:'Under Review',needs_revision:'Needs Revision',approved:'Approved',
    not_started:'Not Started',content_review:'Content Review',copy_edit:'Copy Edit',layout:'Layout',
    ready_to_publish:'Ready to Publish',published:'Published',declined:'Declined',withdrawn:'Withdrawn'
  };
  if (map[s]) return map[s];
  return String(s).replace(/([a-z0-9])([A-Z])/g,'$1 $2').replace(/[-_]+/g,' ').replace(/\s+/g,' ').trim().replace(/\b\w/g,c=>c.toUpperCase());
}
export const ROLES = ['student','editor','admin'] as const;
export const WORKFLOW_STAGES = ['not_started','content_review','copy_edit','layout','ready_to_publish','published','declined'] as const;
export const DEFAULT_PAGE_SIZE = 50;
`;
  log('src/lib/constants.ts'); await w(path.join(root,'src/lib/constants.ts'), constants);

  const badge = `'use client';
import clsx from 'clsx';
import { formatStatus, type SubmissionStatus } from '@/lib/constants';
export default function StatusBadge({ status, className }:{ status: SubmissionStatus; className?: string }){
  const styles: Record<SubmissionStatus,string> = {
    draft:'bg-slate-800/70 text-slate-200 border-slate-500/50',
    submitted:'bg-slate-800/70 text-slate-200 border-slate-500/50',
    under_review:'bg-blue-900/60 text-blue-100 border-blue-500/60',
    needs_revision:'bg-amber-900/60 text-amber-100 border-amber-500/70',
    approved:'bg-emerald-900/60 text-emerald-100 border-emerald-500/70',
    not_started:'bg-slate-800/70 text-slate-200 border-slate-500/50',
    content_review:'bg-blue-900/60 text-blue-100 border-blue-500/60',
    copy_edit:'bg-violet-900/60 text-violet-100 border-violet-500/70',
    layout:'bg-fuchsia-900/60 text-fuchsia-100 border-fuchsia-500/70',
    ready_to_publish:'bg-emerald-900/60 text-emerald-100 border-emerald-500/70',
    published:'bg-green-900/70 text-green-100 border-green-500/70',
    declined:'bg-rose-900/60 text-rose-100 border-rose-500/70',
    withdrawn:'bg-slate-900/60 text-slate-300 border-slate-600/70',
  };
  const cls = styles[status] ?? 'bg-slate-800/70 text-slate-200 border-slate-500/50';
  return <span className={clsx('inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium', cls, className)}>{formatStatus(status)}</span>;
}
// keep legacy named import working
export { StatusBadge };
`;
  log('src/components/common/status-badge.tsx'); await w(path.join(root,'src/components/common/status-badge.tsx'), badge);
}

async function ensureToast(){
  const toast = `'use client';
import * as React from 'react';
export type ToastLevel = 'info' | 'success' | 'error';
type Toast = { id: string; title?: string; description?: string; level: ToastLevel; };
export type ToastContextValue = {
  toasts: Toast[];
  push: (t: Omit<Toast,'id'> | string) => void;
  notify: (t: Omit<Toast,'id'> | string) => void;
  success: (t: Omit<Toast,'id'> | string) => void;
  error: (t: Omit<Toast,'id'> | string) => void;
  dismiss: (id: string) => void;
};
const ToastContext = React.createContext<ToastContextValue | null>(null);
function asToast(input: Omit<Toast,'id'> | string, level?: ToastLevel): Omit<Toast,'id'> {
  if (typeof input === 'string') return { title: input, level: level || 'info' };
  return { level: input.level || level || 'info', title: input.title, description: input.description };
}
export function useToast(){
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <Toaster/>');
  return ctx;
}
export default function Toaster({ children }:{ children?: React.ReactNode }){
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const dismiss = (id:string)=> setToasts(xs=>xs.filter(t=>t.id!==id));
  const pushBase = (t: Omit<Toast,'id'>)=> {
    const id = crypto.randomUUID(); setToasts(xs=>[...xs,{...t,id}]);
    setTimeout(()=>dismiss(id), 4000);
  };
  const push = (t: Omit<Toast,'id'> | string)=> pushBase(asToast(t));
  const notify = (t: Omit<Toast,'id'> | string)=> pushBase(asToast(t,'info'));
  const success = (t: Omit<Toast,'id'> | string)=> pushBase(asToast(t,'success'));
  const error = (t: Omit<Toast,'id'> | string)=> pushBase(asToast(t,'error'));
  return (
    <ToastContext.Provider value={{ toasts, push, notify, success, error, dismiss }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(t=>(
          <div key={t.id} className="rounded border p-3 max-w-sm
            bg-black/80 text-white border-white/20">
            {t.title ? <div className="font-medium">{t.title}</div> : null}
            {t.description ? <div className="text-sm opacity-90">{t.description}</div> : null}
            <button className="text-xs underline mt-1" onClick={()=>dismiss(t.id)}>dismiss</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
`;
  log('src/components/ui/toast.tsx'); await w(path.join(root,'src/components/ui/toast.tsx'), toast);

  const srcDir = path.join(root,'src');
  if (fs.existsSync(srcDir)){
    const files = [];
    (function walk(d){ for (const n of fs.readdirSync(d)){ const p=path.join(d,n); const st=fs.statSync(p);
      if (st.isDirectory()) walk(p); else if (/\.(ts|tsx|js|jsx)$/.test(n)) files.push(p);
    }})(srcDir);
    for (const f of files){
      const s = await read(f); if (!s) continue;
      const out = s.replace(/import\s+useToast\s+from\s+['"]@\/components\/ui\/toast['"]/g,
                            'import { useToast } from "@/components/ui/toast"');
      if (out !== s){ log('fix useToast import '+path.relative(root,f)); await w(f,out); }
    }
  }
}

async function ensureSmoke(){
  const smoke = `import { readFile } from 'node:fs/promises';
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
function get(p){ return new Promise(res=>{ const r=http.get({host:'localhost',port:3000,path:p},(x)=>{ let b=''; x.on('data',c=>b+=c); x.on('end',()=>res({path:p,status:x.statusCode,body:b.slice(0,500)})); }); r.on('error',e=>res({path:p,status:0,body:String(e)})); }); }
async function readManifest(){ const c=['.next/server/app-paths-manifest.json','.next/server/app-paths-manifest-edge.json']; for (const p of c){ try { return JSON.parse(await readFile(p,'utf8')); } catch {} } return null; }
function scan(){ const d=path.join(process.cwd(),'src/app'); if(!fs.existsSync(d)) return ['/']; const S=new Set(['/']); const re=/\\/page\\.(tsx?|jsx?)$/;
  function clean(s){ if(s.startsWith('(')&&s.endsWith(')')) return ''; if(s.startsWith('[')) return 'test'; return s; }
  (function walk(dir,segs=[]){ for (const n of fs.readdirSync(dir)){ const p=path.join(dir,n); const st=fs.statSync(p); if(st.isDirectory()){ if(n==='api') continue; walk(p,[...segs,n]); } else if(re.test(p)){ const r='/'+segs.map(clean).filter(Boolean).join('/'); S.add(r||'/'); } } })(d,[]);
  return Array.from(S);
}
const m=await readManifest(); const routes=m?[...new Set(Object.keys(m).map(r=>r.replace(/\\/page$/,'')||'/'))]:scan();
const rs=await Promise.all(routes.map(r=>get(r))); const bad=rs.filter(x=>!(x.status>=200&&x.status<300));
if(bad.length===0){ console.log('All routes returned 2xx 🎉'); process.exit(0); }
console.log('Routes with problems:'); for(const b of bad){ console.log(b.status+' '+b.path); console.log(b.body); console.log('---'); } process.exit(2);
`;
  log('scripts/smoke.mjs'); await w(path.join(root,'scripts/smoke.mjs'), smoke);
}

async function run(){
  await ensurePkg();
  await ensureNextConfig();
  await ensureTSPaths();
  await ensureTailwind();
  await ensureErrorBoundaries();
  await ensureProvidersAndLayout();
  await stripRogueGlobalCss();
  await ensureSupabaseServerHelper();
  await ensureConstantsAndBadge();
  await ensureToast();
  await ensureSmoke();
  console.log('DONE');
}
await run();
