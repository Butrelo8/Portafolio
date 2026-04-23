import { Database } from 'bun:sqlite';
import { createClient } from '@libsql/client';
import { drizzle as drizzleBun } from 'drizzle-orm/bun-sqlite';
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql';
import { env } from '../env';
import { detectDriver } from './detect';
import * as schema from './schema';

type DB =
  | ReturnType<typeof drizzleLibsql<typeof schema>>
  | ReturnType<typeof drizzleBun<typeof schema>>;

function createDb(): { db: DB; close: () => Promise<void> } {
  const driver = detectDriver(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN);
  if (driver === 'libsql') {
    const client = createClient({
      url: env.DATABASE_URL,
      ...(env.DATABASE_AUTH_TOKEN ? { authToken: env.DATABASE_AUTH_TOKEN } : {}),
    });
    return {
      db: drizzleLibsql(client, { schema }),
      close: async () => client.close(),
    };
  }
  const path = env.DATABASE_URL.replace(/^file:/, '');
  const sqlite = new Database(path);
  sqlite.exec('PRAGMA journal_mode = WAL;');
  return {
    db: drizzleBun(sqlite, { schema }),
    close: async () => sqlite.close(),
  };
}

const instance = createDb();
export const db = instance.db;
export const closeDb = instance.close;
export { schema };
