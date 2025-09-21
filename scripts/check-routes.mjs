#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const appDir = path.join(projectRoot, 'src', 'app');
const ROUTE_CHECK_PORT = Number.parseInt(process.env.ROUTE_CHECK_PORT ?? '4319', 10);

async function collectRoutes(dir, segments = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  const routes = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('@')) {
        continue;
      }
      if (entry.name.includes('[')) {
        continue;
      }
      const nextSegments =
        entry.name.startsWith('(') && entry.name.endsWith(')')
          ? segments
          : [...segments, entry.name];
      const childRoutes = await collectRoutes(path.join(dir, entry.name), nextSegments);
      routes.push(...childRoutes);
      continue;
    }

    if (entry.isFile() && entry.name === 'page.tsx') {
      if (segments.some((segment) => segment.includes('['))) {
        continue;
      }
      const normalized = segments.filter(Boolean);
      const routePath = normalized.length === 0 ? '/' : `/${normalized.join('/')}`;
      routes.push(routePath);
    }
  }

  return routes;
}

function startDevServer(port) {
  const nextCli = path.join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
  const args = [nextCli, 'dev', '--hostname', '127.0.0.1', '--port', String(port)];
  const serverLogs = [];
  let readyResolved = false;
  let readyRejected = false;
  let resolveReady;
  let rejectReady;

  const readyPromise = new Promise((resolve, reject) => {
    resolveReady = (value) => {
      if (!readyResolved && !readyRejected) {
        readyResolved = true;
        resolve(value);
      }
    };
    rejectReady = (error) => {
      if (!readyResolved && !readyRejected) {
        readyRejected = true;
        reject(error);
      }
    };
  });

  const child = spawn(process.execPath, args, {
    cwd: projectRoot,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const readyPatterns = [/ready - started server/i, /started server on/i, /ready - local/i, /ready in/i, /local:/i];

  const handleOutput = (source) => (data) => {
    const text = data.toString();
    serverLogs.push({ source, text });
    if (!readyResolved && readyPatterns.some((pattern) => pattern.test(text))) {
      resolveReady();
    }
  };

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', handleOutput('stdout'));
  child.stderr.on('data', handleOutput('stderr'));

  child.on('exit', (code, signal) => {
    if (!readyResolved && !readyRejected) {
      rejectReady(
        new Error(
          `Dev server exited before becoming ready (code ${code ?? 'null'}, signal ${signal ?? 'null'})`
        )
      );
    }
  });

  child.on('error', (error) => {
    if (!readyResolved && !readyRejected) {
      rejectReady(error);
    }
  });

  const startupTimeout = setTimeout(() => {
    if (!readyResolved && !readyRejected) {
      rejectReady(new Error('Timed out waiting for dev server to start.'));
    }
  }, 30000);

  readyPromise
    .catch(() => {})
    .finally(() => {
      clearTimeout(startupTimeout);
    });

  return { child, ready: readyPromise, serverLogs };
}

async function shutdownDevServer(child) {
  if (!child || child.exitCode !== null) {
    return;
  }
  child.kill('SIGINT');
  const timedOut = await Promise.race([
    once(child, 'exit').then(() => false),
    delay(5000).then(() => true),
  ]);
  if (timedOut && child.exitCode === null) {
    child.kill('SIGKILL');
  }
}

function detectServerErrors(serverLogs) {
  const lines = serverLogs
    .flatMap((entry) => entry.text.split(/\r?\n/))
    .map((line) => line.trim())
    .filter(Boolean);

  const errorPatterns = [/^error\s+-/i, /\bError:/, /\bTypeError:/, /\bReferenceError:/, /\bUnhandled\b/i];
  const stackPattern = /^at\s+/i;

  return lines.filter((line) => errorPatterns.some((pattern) => pattern.test(line)) || stackPattern.test(line));
}

let devProcess;

async function main() {
  const routes = [...new Set(await collectRoutes(appDir))].sort((a, b) => a.localeCompare(b));

  if (routes.length === 0) {
    console.warn('No page routes discovered.');
    return;
  }

  console.log(`Discovered ${routes.length} routes: ${routes.join(', ')}`);

  const { child, ready, serverLogs } = startDevServer(ROUTE_CHECK_PORT);
  devProcess = child;

  try {
    await ready;
    await delay(1000);

    const failures = [];
    for (const route of routes) {
      const url = new URL(route, `http://127.0.0.1:${ROUTE_CHECK_PORT}`);
      process.stdout.write(`→ Fetching ${url.pathname} ... `);
      try {
        const response = await fetch(url, { redirect: 'follow' });
        await response.text();
        if (!response.ok) {
          failures.push(`${route} responded with status ${response.status}`);
          console.log(`failed (${response.status})`);
        } else {
          console.log(`ok (${response.status})`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${route} threw ${message}`);
        console.log(`failed (${message})`);
      }
      await delay(150);
    }

    const errorLines = detectServerErrors(serverLogs);

    if (failures.length > 0 || errorLines.length > 0) {
      if (errorLines.length > 0) {
        console.error('Server emitted errors during route crawl:');
        for (const line of [...new Set(errorLines)]) {
          console.error(`  ${line}`);
        }
      }
      if (failures.length > 0) {
        console.error('Route fetch failures:');
        for (const failure of failures) {
          console.error(`  ${failure}`);
        }
      }
      process.exitCode = 1;
      return;
    }

    console.log('All routes responded successfully without server errors.');
  } finally {
    await shutdownDevServer(devProcess);
    devProcess = undefined;
  }
}

const terminationSignals = ['SIGINT', 'SIGTERM'];
for (const signal of terminationSignals) {
  process.on(signal, async () => {
    await shutdownDevServer(devProcess);
    process.exit(1);
  });
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  await shutdownDevServer(devProcess);
  process.exitCode = 1;
});
