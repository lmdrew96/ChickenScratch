#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const artifactsDir = path.join(projectRoot, '.artifacts');
const devLogsDir = path.join(artifactsDir, 'dev-logs');
const DEFAULT_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
  ALLOWED_DOMAINS: 'udel.edu,dtcc.edu',
};

function getPnpmCommand() {
  return process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
}

function withDefaultEnv(env) {
  const merged = { ...env };
  for (const [key, value] of Object.entries(DEFAULT_ENV)) {
    if (!merged[key]) {
      merged[key] = value;
    }
  }
  return merged;
}

async function findAvailablePort() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = 4100 + Math.floor(Math.random() * 1000);
    const available = await new Promise((resolve) => {
      const server = net.createServer();
      server.unref();
      server.on('error', () => {
        resolve(false);
      });
      server.listen(candidate, '127.0.0.1', () => {
        server.close(() => resolve(true));
      });
    });
    if (available) {
      return candidate;
    }
  }
  throw new Error('Unable to find an available port for the dev server.');
}

const READY_PATTERNS = [/ready - started server/i, /started server on/i, /ready in/i, /local:/i];

function createLogCollector(mode) {
  const logs = [];
  const prefix = `[next:${mode}]`;

  const append = (source, data) => {
    const text = data.toString();
    logs.push({
      timestamp: new Date().toISOString(),
      source,
      text,
    });
    process.stdout.write(`${prefix}[${source}] ${text}`);
  };

  return { logs, append };
}

function startNextServer(mode, port) {
  const nextCli = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const args = [nextCli, mode === 'dev' ? 'dev' : 'start', '--hostname', '127.0.0.1', '--port', String(port)];
  const env = withDefaultEnv({
    ...process.env,
    NODE_ENV: mode === 'dev' ? 'development' : 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    PORT: String(port),
  });

  const { logs, append } = createLogCollector(mode);

  let resolveReady;
  let rejectReady;
  let readySettled = false;
  const readyPromise = new Promise((resolve, reject) => {
    resolveReady = (value) => {
      if (!readySettled) {
        readySettled = true;
        resolve(value);
      }
    };
    rejectReady = (error) => {
      if (!readySettled) {
        readySettled = true;
        reject(error);
      }
    };
  });

  const child = spawn(process.execPath, args, {
    cwd: projectRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const onData = (stream) => (data) => {
    append(stream, data);
    if (!readySettled && READY_PATTERNS.some((pattern) => pattern.test(data.toString()))) {
      resolveReady();
    }
  };

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', onData('stdout'));
  child.stderr.on('data', onData('stderr'));

  child.on('exit', (code, signal) => {
    if (!readySettled) {
      rejectReady(new Error(`Next.js server exited before becoming ready (code ${code ?? 'null'}, signal ${signal ?? 'null'})`));
    }
  });
  child.on('error', (error) => {
    if (!readySettled) {
      rejectReady(error);
    }
  });

  return { child, ready: readyPromise, logs };
}

async function stopServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }
  child.kill('SIGINT');
  const exited = await Promise.race([
    once(child, 'exit').then(() => true),
    delay(5000).then(() => false),
  ]);
  if (!exited && child.exitCode === null) {
    child.kill('SIGKILL');
    await once(child, 'exit').catch(() => {});
  }
}

function detectLogErrors(logs) {
  const errorPatterns = [
    /\bError:/i,
    /UnhandledPromiseRejection/i,
    /Hydration failed/i,
    /Cookies can only be modified/i,
  ];
  const stackPattern = /^at\s+/i;

  const lines = logs
    .flatMap((entry) => entry.text.split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);

  const flagged = [];
  for (const line of lines) {
    if (errorPatterns.some((pattern) => pattern.test(line)) || stackPattern.test(line)) {
      flagged.push(line);
    }
  }
  return [...new Set(flagged)];
}

async function persistLogs(logs, directory) {
  await mkdir(directory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(directory, `next-${timestamp}.log`);
  const content = logs
    .map((entry) => `[${entry.timestamp}] [${entry.source}] ${entry.text}`)
    .join('');
  await writeFile(filePath, content, 'utf8');
  return filePath;
}

let browserInstallPromise;

function runPlaywrightSetupCommand(args, { allowFailure = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(getPnpmCommand(), ['exec', 'playwright', ...args], {
      cwd: projectRoot,
      stdio: 'inherit',
      env: { ...process.env },
    });
    child.on('error', (error) => {
      if (allowFailure) {
        console.warn(`playwright ${args.join(' ')} failed: ${error instanceof Error ? error.message : String(error)}`);
        resolve();
        return;
      }
      reject(error);
    });
    child.on('exit', (code) => {
      if (code === 0 || (allowFailure && code !== 0)) {
        if (allowFailure && code !== 0) {
          console.warn(`playwright ${args.join(' ')} exited with code ${code}`);
        }
        resolve();
      } else {
        reject(new Error(`playwright ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

async function ensurePlaywrightBrowsers() {
  if (!browserInstallPromise) {
    browserInstallPromise = (async () => {
      await runPlaywrightSetupCommand(['install-deps', 'chromium'], { allowFailure: true });
      await runPlaywrightSetupCommand(['install', 'chromium']);
    })();
  }
  return browserInstallPromise;
}

async function runPlaywright(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(getPnpmCommand(), ['exec', 'playwright', 'test', 'tests/e2e/visit-all.spec.ts'], {
      cwd: projectRoot,
      stdio: ['inherit', 'inherit', 'inherit'],
      env: {
        ...process.env,
        CRAWL_BASE_URL: baseUrl,
        CRAWL_MODE: 'dev',
      },
    });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code ?? 1));
  });
}

let activeServer;

async function main() {
  await mkdir(artifactsDir, { recursive: true });
  const port = await findAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`Starting Next.js dev server on ${baseUrl}`);
  const server = startNextServer('dev', port);
  activeServer = server.child;

  let logFilePath;

  try {
    await server.ready;
    console.log('Dev server is ready. Ensuring Playwright browsers are installed...');
    await ensurePlaywrightBrowsers();
    console.log('Running Playwright crawl against dev server...');
    const exitCode = await runPlaywright(baseUrl);
    if (exitCode !== 0) {
      throw new Error(`Playwright crawl failed with exit code ${exitCode}`);
    }
    const logErrors = detectLogErrors(server.logs);
    if (logErrors.length > 0) {
      logFilePath = await persistLogs(server.logs, devLogsDir);
      throw new Error(
        `Detected ${logErrors.length} error lines in dev server logs. See ${path.relative(projectRoot, logFilePath)} for details.`
      );
    }
    console.log('Dev crawl completed successfully without detected runtime errors.');
  } catch (error) {
    if (!logFilePath) {
      try {
        logFilePath = await persistLogs(server.logs, devLogsDir);
        console.error(`Preserved dev server logs at ${path.relative(projectRoot, logFilePath)}`);
      } catch (persistError) {
        console.error(`Failed to persist dev logs: ${persistError instanceof Error ? persistError.message : persistError}`);
      }
    }
    throw error;
  } finally {
    await stopServer(activeServer);
    activeServer = undefined;
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    await stopServer(activeServer);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
