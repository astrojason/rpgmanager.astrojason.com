import { getDb } from '@/lib/turso';

export async function ensureJunction(table: string, a: string, b: string) {
  const db = getDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS ${table} (${a} TEXT NOT NULL, ${b} TEXT NOT NULL, PRIMARY KEY(${a},${b}))`);
}

export async function loadJunctionMap(table: string, a: string, b: string): Promise<Map<string, string[]>> {
  const db = getDb();
  const res = await db.execute(`SELECT ${a} as a, ${b} as b FROM ${table}`);
  const map = new Map<string, string[]>();
  for (const row of res.rows as Record<string, unknown>[]) {
    const key = String((row as Record<string, unknown>).a);
    const val = String((row as Record<string, unknown>).b);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(val);
  }
  return map;
}

export async function replaceJunctionForKey(table: string, a: string, b: string, key: string, values: string[]) {
  const db = getDb();
  await db.execute({ sql: `DELETE FROM ${table} WHERE ${a}=?`, args: [key] });
  for (const v of values) {
    await db.execute({ sql: `INSERT OR IGNORE INTO ${table} (${a},${b}) VALUES (?,?)`, args: [key, v] });
  }
}

