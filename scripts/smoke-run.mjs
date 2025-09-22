import { spawn } from 'node:child_process';
import net from 'node:net';

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || 'localhost';

function waitForPort({ port, host, timeoutMs = 30000 }) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    (function tick() {
      const s = net.createConnection(port, host);
      s.once('connect', () => { s.end(); resolve(true); });
      s.once('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error(`Timed out waiting for ${host}:${port}`));
        setTimeout(tick, 200);
      });
    })();
  });
}

function run(cmd, args, env) {
  return spawn(cmd, args, { stdio: 'inherit', env });
}

const env = { ...process.env, PORT: String(PORT) };

// 1) start Next server
const server = run('pnpm', ['start'], env);

// 2) wait for port to open
try {
  await waitForPort({ port: PORT, host: HOST, timeoutMs: 30000 });
} catch (e) {
  console.error(String(e));
  server.kill('SIGINT');
  process.exit(1);
}

// 3) run smoke test
const smoke = run('node', ['scripts/smoke.mjs'], env);

// 4) on smoke exit, shut down server and propagate exit code
smoke.on('exit', (code) => {
  server.kill('SIGINT');
  // give Next a moment to exit
  setTimeout(() => process.exit(code ?? 1), 300);
});
