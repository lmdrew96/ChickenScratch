#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const artifactsDir = path.join(projectRoot, '.artifacts');
const fixturesPath = path.join(artifactsDir, 'fixtures.json');
const cleanupPath = path.join(artifactsDir, 'cleanup.json');

function getEnv(name) {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function createSupabaseContext() {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const warnings = [];

  if (!url || !anonKey) {
    warnings.push('Supabase URL or anon key not configured; dynamic route fixtures will fall back to sentinels.');
    return { warnings };
  }

  const readClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const serviceClient = serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : undefined;

  if (!serviceClient) {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY is not set; fixture generators cannot create temporary records.');
  }

  return { readClient, serviceClient, warnings };
}

async function gatherPublishedSubmissionFixtures(route, context) {
  const notes = [];
  const entries = [];
  const cleanup = [];

  if (!context.readClient) {
    notes.push('Read-only Supabase client unavailable; skipping published submissions fetch.');
    return { entries, cleanup, notes };
  }

  const { data, error } = await context.readClient
    .from('submissions')
    .select('id')
    .eq('published', true)
    .limit(5);

  if (error) {
    notes.push(`Supabase query error: ${error.message}`);
  }

  if (data && Array.isArray(data)) {
    for (const row of data) {
      if (!row?.id) {
        continue;
      }
      entries.push({
        params: { id: row.id },
        source: 'supabase',
        description: 'Published submission fetched from Supabase.',
      });
    }
  }

  if (entries.length === 0) {
    notes.push('No published submissions found; attempting to create a temporary fixture record.');

    if (!context.serviceClient) {
      notes.push('Service role client unavailable; skipping fixture creation.');
      return { entries, cleanup, notes };
    }

    const profileResult = await context.serviceClient
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (profileResult.error) {
      notes.push(`Failed to locate profile for fixture creation: ${profileResult.error.message}`);
      return { entries, cleanup, notes };
    }

    const ownerId = profileResult.data?.id;
    if (!ownerId) {
      notes.push('No profiles available for fixture creation.');
      return { entries, cleanup, notes };
    }

    const insertion = await context.serviceClient
      .from('submissions')
      .insert({
        owner_id: ownerId,
        title: 'Automated Fixture Submission',
        type: 'writing',
        summary: 'Temporary submission created for automated route crawling.',
        text_body: 'This record exists solely for automated runtime checks and should be cleaned up automatically.',
        published: true,
        status: 'published',
        published_url: 'https://example.com/fixture',
        issue: 'automation-fixture',
      })
      .select('id')
      .maybeSingle();

    if (insertion.error) {
      notes.push(`Failed to create fixture submission: ${insertion.error.message}`);
      return { entries, cleanup, notes };
    }

    if (insertion.data?.id) {
      entries.push({
        params: { id: insertion.data.id },
        source: 'supabase-fixture',
        description: 'Temporary published submission created for the manifest crawl.',
      });
      cleanup.push({
        type: 'supabase',
        table: 'submissions',
        column: 'id',
        value: insertion.data.id,
      });
      notes.push('Created temporary published submission for crawl fixture.');
    }
  }

  return { entries, cleanup, notes };
}

const generators = [
  {
    match: (route) => route.pattern === '/published/[id]',
    handler: gatherPublishedSubmissionFixtures,
  },
];

function selectGenerator(route) {
  return generators.find((candidate) => candidate.match(route))?.handler;
}

export async function resolveRouteFixtures(routes) {
  const context = createSupabaseContext();
  const fixtures = new Map();
  const cleanup = [];
  const routeMetadata = [];

  await mkdir(artifactsDir, { recursive: true });

  for (const route of routes) {
    const metadataEntry = {
      pattern: route.pattern,
      file: route.filePath,
      notes: [],
    };

    const generator = selectGenerator(route);
    if (!generator) {
      metadataEntry.notes.push('No fixture generator configured for this route; using sentinel fallback.');
      metadataEntry.entries = 0;
      fixtures.set(route.pattern, []);
      routeMetadata.push(metadataEntry);
      continue;
    }

    try {
      const result = await generator(route, context);
      fixtures.set(route.pattern, result.entries ?? []);
      cleanup.push(...(result.cleanup ?? []));
      if (result.notes && result.notes.length > 0) {
        metadataEntry.notes.push(...result.notes);
      }
      metadataEntry.entries = (result.entries ?? []).length;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      metadataEntry.notes.push(`Fixture generator threw: ${message}`);
      fixtures.set(route.pattern, []);
      metadataEntry.entries = 0;
    }

    routeMetadata.push(metadataEntry);
  }

  const metadata = {
    generatedAt: new Date().toISOString(),
    supabase: {
      configured: Boolean(context.readClient),
      serviceRoleConfigured: Boolean(context.serviceClient),
      warnings: context.warnings ?? [],
    },
    routes: routeMetadata,
  };

  const serialisableFixtures = Array.from(fixtures.entries()).map(([pattern, entries]) => ({
    pattern,
    entries: entries.map((entry) => ({
      params: entry.params,
      source: entry.source,
      description: entry.description,
      allowedStatuses: entry.allowedStatuses,
    })),
  }));

  await writeFile(
    fixturesPath,
    `${JSON.stringify({
      generatedAt: metadata.generatedAt,
      supabase: metadata.supabase,
      routes: serialisableFixtures,
    }, null, 2)}\n`,
    'utf8'
  );

  await writeFile(
    cleanupPath,
    `${JSON.stringify({
      generatedAt: metadata.generatedAt,
      tasks: cleanup,
    }, null, 2)}\n`,
    'utf8'
  );

  return { fixtures, cleanup, metadata };
}
