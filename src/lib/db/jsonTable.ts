import { getDb } from '@/lib/turso';

export async function getAllJSON<T = unknown>(table: string): Promise<T[]> {
  const db = getDb();
  const res = await db.execute(`SELECT data FROM ${table}`);
  return res.rows.map((r) => JSON.parse(String((r as Record<string, unknown>).data)) as T);
}

export async function insertJSON<T extends object>(table: string, id: string, obj: T): Promise<void> {
  const db = getDb();
  await db.execute({ sql: `INSERT INTO ${table} (id,data) VALUES (?, ?)`, args: [id, JSON.stringify(obj)] });
}

export async function updateJSON<T extends object>(table: string, id: string, obj: T): Promise<number> {
  const db = getDb();
  const res = await db.execute({ sql: `UPDATE ${table} SET data=? WHERE id=?`, args: [JSON.stringify(obj), id] });
  return res.rowsAffected ?? 0;
}

export async function deleteById(table: string, id: string): Promise<number> {
  const db = getDb();
  const res = await db.execute({ sql: `DELETE FROM ${table} WHERE id=?`, args: [id] });
  return res.rowsAffected ?? 0;
}

