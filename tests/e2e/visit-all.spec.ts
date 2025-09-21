import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

type ManifestEntry = {
  path: string;
  source?: string;
  description?: string;
  allowedStatuses?: number[];
};

type RouteDefinition = {
  pattern: string;
  kind: 'static' | 'dynamic';
  file: string;
  params: Array<{ name: string; catchAll: boolean; optional: boolean; segment: string }>;
  entries: ManifestEntry[];
};

type RouteManifest = {
  generatedAt: string;
  routes: RouteDefinition[];
  metadata?: unknown;
};

type CleanupTask = {
  type: string;
  table?: string;
  column?: string;
  value?: string;
};

const baseUrl = process.env.CRAWL_BASE_URL;
if (!baseUrl) {
  throw new Error('CRAWL_BASE_URL environment variable is required for the route crawler.');
}

const manifestPath = path.join(process.cwd(), '.artifacts', 'route-manifest.json');
let manifest: RouteManifest;

try {
  const manifestRaw = readFileSync(manifestPath, 'utf8');
  manifest = JSON.parse(manifestRaw) as RouteManifest;
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Failed to read route manifest at ${manifestPath}: ${message}`);
}

if (!manifest.routes || manifest.routes.length === 0) {
  throw new Error(`Route manifest at ${manifestPath} does not contain any routes.`);
}

function buildUrl(pathname: string) {
  if (!pathname.startsWith('/')) {
    return new URL(`/${pathname}`, baseUrl).toString();
  }
  return new URL(pathname, baseUrl).toString();
}

function isIgnorableRequestFailure(url: string, failureText: string | null | undefined) {
  if (!failureText) {
    return false;
  }
  const normalized = failureText.toLowerCase();
  if (normalized.includes('net::err_aborted') || normalized.includes('ns_bindings_aborted')) {
    if (
      url.includes('_next/webpack-hmr') ||
      url.includes('_next/static/chunks/webpack-hmr') ||
      url.includes('_rsc=') ||
      url.includes('/_next/data/')
    ) {
      return true;
    }
  }
  if (normalized.includes('net::err_unknown_url_scheme')) {
    return true;
  }
  return false;
}

let cleanupRan = false;
async function performCleanup() {
  if (cleanupRan) {
    return;
  }
  cleanupRan = true;
  const cleanupFile = path.join(process.cwd(), '.artifacts', 'cleanup.json');
  let raw: string;
  try {
    raw = await fs.readFile(cleanupFile, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    throw error;
  }

  let parsed: { tasks?: CleanupTask[] };
  try {
    parsed = JSON.parse(raw) as { tasks?: CleanupTask[] };
  } catch (error) {
    console.warn(`Failed to parse cleanup file at ${cleanupFile}:`, error);
    return;
  }

  const tasks = Array.isArray(parsed.tasks) ? parsed.tasks : [];
  if (tasks.length === 0) {
    return;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    console.warn('Skipping Supabase cleanup because service role credentials are missing.');
    return;
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const task of tasks) {
    if (task.type !== 'supabase' || !task.table || !task.value) {
      continue;
    }
    const column = task.column ?? 'id';
    const { error } = await client.from(task.table).delete().eq(column, task.value);
    if (error) {
      console.warn(`Failed to clean up ${task.table}.${column}=${task.value}: ${error.message}`);
    }
  }
}

test.describe('route manifest crawl', () => {
  test.describe.configure({ mode: 'serial' });

  for (const route of manifest.routes) {
    for (const entry of route.entries) {
      const title = `${entry.path} [${entry.source ?? route.kind}]`;
      test(title, async ({ page }) => {
        const consoleErrors: string[] = [];
        const pageErrors: string[] = [];
        const requestFailures: Array<{ url: string; failure: string | null | undefined }> = [];

        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            consoleErrors.push(`${msg.text()} @ ${JSON.stringify(msg.location())}`);
          }
        });

        page.on('pageerror', (error) => {
          pageErrors.push(error instanceof Error ? error.stack ?? error.message : String(error));
        });

        page.on('requestfailed', (request) => {
          const failure = request.failure();
          if (isIgnorableRequestFailure(request.url(), failure?.errorText)) {
            return;
          }
          requestFailures.push({ url: request.url(), failure: failure?.errorText });
        });

        const url = buildUrl(entry.path);
        const response = await page.goto(url, {
          waitUntil: 'networkidle',
          timeout: 45_000,
        });

        expect(response, `Expected response when navigating to ${entry.path}`).not.toBeNull();
        const status = response!.status();
        const allowedStatuses = entry.allowedStatuses && entry.allowedStatuses.length > 0 ? entry.allowedStatuses : [200];
        expect(allowedStatuses, `Allowed statuses for ${entry.path}`).toContain(status);

        await page.waitForTimeout(300);

        const filteredConsoleErrors = consoleErrors.filter((message) => {
          if (status === 404 && /Failed to load resource: the server responded with a status of 404/i.test(message)) {
            return false;
          }
          return true;
        });

        expect(filteredConsoleErrors, `Console errors for ${entry.path}`).toEqual([]);
        expect(pageErrors, `Unhandled page errors for ${entry.path}`).toEqual([]);
        expect(requestFailures, `Network request failures for ${entry.path}`).toEqual([]);

        const overlay = await page.evaluate(() => {
          const selectors = [
            '#nextjs-portal-root [data-nextjs-error-overlay]',
            '#nextjs-build-error',
            '[data-nextjs-error-overlay]',
            '#nextjs__container',
            '#webpack-dev-server-client-overlay-div',
          ];
          for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent) {
              return { selector, text: element.textContent.trim() };
            }
          }
          return null;
        });

        expect(overlay, `Error overlay detected for ${entry.path}`).toBeNull();
      });
    }
  }

  test.afterAll(async () => {
    await performCleanup();
  });
});
