/**
 * Apply SQL migrations in `src/db/migrations/` to the database from `env`.
 * Supports `file:` (bun:sqlite) and libsql remote URLs (same rules as `src/db/index.ts`).
 */

import { Database } from 'bun:sqlite';
import { createClient } from '@libsql/client';
import { drizzle as drizzleBun } from 'drizzle-orm/bun-sqlite';
import { migrate as migrateBun } from 'drizzle-orm/bun-sqlite/migrator';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { migrate as migrateLibsql } from 'drizzle-orm/libsql/migrator';
import { detectDriver } from '../src/db/detect';
import * as schema from '../src/db/schema';
import { env } from '../src/env';

const migrationsFolder = `${import.meta.dir}/../src/db/migrations`;

const driver = detectDriver(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN);

if (driver === 'libsql') {
  const client = createClient({
    url: env.DATABASE_URL,
    ...(env.DATABASE_AUTH_TOKEN ? { authToken: env.DATABASE_AUTH_TOKEN } : {}),
  });
  const db = drizzleLibsql(client, { schema });
  await migrateLibsql(db, { migrationsFolder });
  client.close();
} else {
  const path = env.DATABASE_URL.replace(/^file:/, '');
  const sqlite = new Database(path);
  const db = drizzleBun(sqlite, { schema });
  migrateBun(db, { migrationsFolder });
  sqlite.close();
}

console.log('Migrations applied.');
