import { createClient, Client } from '@libsql/client';

let cached: Client | null = null;

export function getDb(): Client {
  if (cached) return cached;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url) {
    throw new Error('TURSO_DATABASE_URL is not set');
  }
  cached = createClient({ url, authToken });
  return cached;
}

export async function ensureTable(table: string) {
  const db = getDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS ${table} (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )`);
}

