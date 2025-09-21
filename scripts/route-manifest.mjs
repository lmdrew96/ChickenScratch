#!/usr/bin/env node

import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const appDir = path.join(projectRoot, 'src', 'app');
const artifactsDir = path.join(projectRoot, '.artifacts');

function normalizeDynamicSegment(segment) {
  if (segment.kind !== 'dynamic') {
    return segment.value;
  }
  if (segment.catchAll) {
    const prefix = segment.optional ? '[[...' : '[...';
    const suffix = segment.optional ? ']]' : ']';
    return `${prefix}${segment.value}${suffix}`;
  }
  return `[${segment.value}]`;
}

function parseSegmentName(name) {
  if (name.startsWith('@') || name.startsWith('_')) {
    return { kind: 'skip' };
  }
  if (name === 'api') {
    return { kind: 'skip' };
  }
  if (name.startsWith('(') && name.endsWith(')')) {
    return { kind: 'group' };
  }
  if (name.startsWith('[') && name.endsWith(']')) {
    const raw = name.slice(1, -1);
    if (raw.startsWith('...')) {
      return {
        kind: 'dynamic',
        value: raw.slice(3),
        catchAll: true,
        optional: false,
      };
    }
    if (raw.startsWith('[...') && raw.endsWith(']')) {
      const inner = raw.slice(1, -1);
      return {
        kind: 'dynamic',
        value: inner.slice(3),
        catchAll: true,
        optional: true,
      };
    }
    return {
      kind: 'dynamic',
      value: raw,
      catchAll: false,
      optional: false,
    };
  }
  return { kind: 'static', value: name };
}

async function collectRoutes(currentDir, segments = []) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const routes = [];

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    if (entry.isFile() && entry.name === 'page.tsx') {
      const patternSegments = segments.map((segment) => normalizeDynamicSegment(segment));
      const pattern = patternSegments.length === 0 ? '/' : `/${patternSegments.join('/')}`;
      const params = segments.filter((segment) => segment.kind === 'dynamic');
      const kind = params.length > 0 ? 'dynamic' : 'static';
      routes.push({
        pattern,
        kind,
        params: params.map((param) => ({
          name: param.value,
          catchAll: Boolean(param.catchAll),
          optional: Boolean(param.optional),
          segment: normalizeDynamicSegment(param),
        })),
        segments: segments.map((segment) => ({
          kind: segment.kind,
          value: segment.value,
          catchAll: Boolean(segment.catchAll),
          optional: Boolean(segment.optional),
        })),
        filePath: path.relative(projectRoot, fullPath),
      });
      continue;
    }

    if (!entry.isDirectory()) {
      continue;
    }

    const segment = parseSegmentName(entry.name);
    if (segment.kind === 'skip') {
      continue;
    }
    if (segment.kind === 'group') {
      const childRoutes = await collectRoutes(fullPath, segments);
      routes.push(...childRoutes);
      continue;
    }

    const childSegments = segment.kind === 'static' || segment.kind === 'dynamic'
      ? [...segments, segment]
      : segments;
    const childRoutes = await collectRoutes(fullPath, childSegments);
    routes.push(...childRoutes);
  }

  return routes;
}

function buildPathFromParams(route, params) {
  const parts = [];

  for (const segment of route.segments) {
    if (segment.kind !== 'dynamic') {
      parts.push(segment.value);
      continue;
    }
    const rawValue = params?.[segment.value];
    if (rawValue == null || (Array.isArray(rawValue) && rawValue.length === 0)) {
      if (segment.optional) {
        continue;
      }
      throw new Error(`Missing value for dynamic segment "${segment.value}" in route ${route.pattern}`);
    }
    if (segment.catchAll) {
      const values = Array.isArray(rawValue)
        ? rawValue
        : String(rawValue)
            .split('/')
            .map((part) => part.trim())
            .filter(Boolean);
      if (values.length === 0) {
        if (segment.optional) {
          continue;
        }
        throw new Error(`Missing value for catch-all segment "${segment.value}" in route ${route.pattern}`);
      }
      parts.push(...values);
      continue;
    }
    if (Array.isArray(rawValue)) {
      parts.push(String(rawValue[0]));
      continue;
    }
    parts.push(String(rawValue));
  }

  return parts.length === 0 ? '/' : `/${parts.join('/')}`;
}

function createSentinelParams(route) {
  const params = {};
  for (const param of route.params) {
    if (param.catchAll) {
      params[param.name] = [`__manifest-empty-${param.name}__`];
    } else {
      params[param.name] = `__manifest-empty-${param.name}__`;
    }
  }
  return params;
}

async function main() {
  const routes = await collectRoutes(appDir);
  routes.sort((a, b) => a.pattern.localeCompare(b.pattern));

  const dynamicRoutes = routes.filter((route) => route.kind === 'dynamic');
  const { resolveRouteFixtures } = await import('./route-fixtures.mjs');
  const { fixtures, metadata } = await resolveRouteFixtures(dynamicRoutes);

  const manifestRoutes = [];

  for (const route of routes) {
    if (route.kind === 'static') {
      manifestRoutes.push({
        pattern: route.pattern,
        kind: route.kind,
        file: route.filePath,
        params: [],
        entries: [
          {
            path: route.pattern,
            source: 'static',
            allowedStatuses: [200],
          },
        ],
      });
      continue;
    }

    const fixtureEntries = fixtures.get(route.pattern) ?? [];
    const resolvedEntries = [];

    for (const fixture of fixtureEntries) {
      try {
        const pathFromParams = buildPathFromParams(route, fixture.params ?? {});
        resolvedEntries.push({
          path: pathFromParams,
          source: fixture.source ?? 'unknown',
          description: fixture.description,
          allowedStatuses: fixture.allowedStatuses ?? [200],
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Failed to build path for ${route.pattern}: ${message}`);
      }
    }

    if (resolvedEntries.length === 0) {
      const sentinelParams = createSentinelParams(route);
      const sentinelPath = buildPathFromParams(route, sentinelParams);
      resolvedEntries.push({
        path: sentinelPath,
        source: 'sentinel',
        description: 'Fallback sentinel because no fixture data was discovered.',
        allowedStatuses: [200, 404],
      });
    }

    manifestRoutes.push({
      pattern: route.pattern,
      kind: route.kind,
      file: route.filePath,
      params: route.params,
      entries: resolvedEntries,
    });
  }

  await mkdir(artifactsDir, { recursive: true });
  const manifestPath = path.join(artifactsDir, 'route-manifest.json');
  const payload = {
    generatedAt: new Date().toISOString(),
    routes: manifestRoutes,
    metadata,
  };
  await writeFile(manifestPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`Wrote route manifest with ${manifestRoutes.length} routes to ${path.relative(projectRoot, manifestPath)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exitCode = 1;
});
