import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';
import { env } from '@/lib/env';

function createDb() {
  const sql = neon(env.DATABASE_URL);
  return drizzle(sql, { schema });
}

// Use globalThis to preserve the singleton across HMR in development
const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof createDb> };

export function db() {
  if (!globalForDb.__db) {
    globalForDb.__db = createDb();
  }
  return globalForDb.__db;
}
