/**
 * Runs before any test file. Ensures parseEnv-required keys exist and `items` table exists for file-backed SQLite.
 */

import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const envDefaults: Record<string, string> = {
  NODE_ENV: 'test',
  CLERK_SECRET_KEY: 'sk_test_preload',
  CLERK_PUBLISHABLE_KEY: 'pk_test_preload',
  ALLOWED_ORIGINS: 'http://localhost:4321',
};

for (const [key, value] of Object.entries(envDefaults)) {
  if (process.env[key] === undefined) process.env[key] = value;
}

/** Isolated file DB for every `bun test` run so DDL matches Drizzle (avoids parent env libsql / wrong file). */
const testDbPath = resolve(process.cwd(), '.test-data/items-test.db');
process.env.DATABASE_URL = `file:${testDbPath}`;
delete process.env.DATABASE_AUTH_TOKEN;

mkdirSync(dirname(testDbPath), { recursive: true });
const sqlite = new Database(testDbPath);
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id text PRIMARY KEY NOT NULL,
    owner_id text NOT NULL,
    name text NOT NULL,
    description text,
    created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
  );
  CREATE INDEX IF NOT EXISTS items_owner_id_idx ON items(owner_id);
`);
sqlite.close();
