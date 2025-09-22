import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || 'localhost';

function get(p){
  return new Promise((resolve)=>{
    const req = http.get({ host: HOST, port: PORT, path: p }, (res)=>{
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', ()=> resolve({ path: p, status: res.statusCode, body: buf.slice(0, 500) }));
    });
    req.on('error', e => resolve({ path: p, status: 0, body: String(e) }));
  });
}

function scanAppPages() {
  const appDir = path.join(process.cwd(), 'src/app');
  const items = [];
  if (!fs.existsSync(appDir)) return [{ path: '/', dynamic: false }];
  const pageRe = /\/page\.(tsx?|jsx?)$/;

  function cleanSeg(seg) {
    if (seg.startsWith('(') && seg.endsWith(')')) return { seg: '', dynamic: false }; // group
    if (seg.startsWith('[')) return { seg: 'test', dynamic: true };                    // dynamic
    return { seg, dynamic: false };
  }

  (function walk(dir, segs = [], dyn = false) {
    for (const name of fs.readdirSync(dir)) {
      const p = path.join(dir, name);
      const st = fs.statSync(p);
      if (st.isDirectory()) {
        if (name === 'api') continue; // skip API from page smoke
        walk(p, [...segs, name], dyn || name.startsWith('['));
      } else if (pageRe.test(p)) {
        const cleaned = segs.map(cleanSeg);
        const pathStr = '/' + cleaned.map(x => x.seg).filter(Boolean).join('/');
        const isDyn = dyn || cleaned.some(x => x.dynamic);
        items.push({ path: pathStr || '/', dynamic: isDyn });
      }
    }
  })(appDir, []);

  // remove duplicates and obvious non-pages
  const seen = new Set();
  return items
    .filter(x => x.path !== '/_not-found' && x.path !== '/favicon.ico')
    .filter(x => { const k = x.path; if (seen.has(k)) return false; seen.add(k); return true; });
}

function isOk(status, item) {
  if (status >= 200 && status < 300) return true;  // success
  if (status >= 300 && status < 400) return true;  // auth redirects (login) etc. are fine
  if (item.dynamic && status === 404) return true; // dynamic page with fake id can 404
  return false;
}

const routes = scanAppPages();
const results = await Promise.all(routes.map(r => get(r.path)));
const enriched = results.map((r, i) => ({ ...r, dynamic: routes[i].dynamic }));
const bad = enriched.filter(x => !isOk(x.status || 0, x));

if (bad.length === 0) {
  console.log(`All page routes OK on http://${HOST}:${PORT} 🎉`);
  process.exit(0);
}
console.log('Routes with problems:');
for (const b of bad) {
  console.log(`${b.status} ${b.path}${b.dynamic ? ' (dynamic)' : ''}`);
  console.log(b.body);
  console.log('---');
}
process.exit(2);
