import { spawn } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'
const fetch = globalThis.fetch || (await import('node-fetch')).default
const port = 3111

const server = spawn('pnpm', ['start','-p', String(port)], { stdio: 'inherit', env: { ...process.env } })
let ok=false
for (let i=0;i<60;i++){
  try {
    const r = await fetch(`http://localhost:${port}/published`)
    if (r.status<500) { ok=true; break }
  } catch {}
  await wait(500)
}
if (!ok) { console.error('Server never became ready'); server.kill(); process.exit(1) }

const routes = ['/', '/submit', '/mine', '/published', '/editor', '/committee', '/login']
let fail = 0
for (const r of routes) {
  const res = await fetch(`http://localhost:${port}${r}`)
  const html = await res.text()
  const hasShell = html.includes('class="app-shell"') && html.includes('class="sidebar"')
  const good = res.status < 500 && hasShell
  console.log(`${good ? '✓' : '✗'} ${r}  ${res.status}`)
  if (!good) fail++
}
server.kill()
process.exit(fail ? 1 : 0)
