import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs outside Next.js, so it doesn't see .env.local by default.
// Load it manually (without pulling in dotenv) so `npx drizzle-kit push` works.
function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const contents = readFileSync(path, 'utf8');
  for (const raw of contents.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
