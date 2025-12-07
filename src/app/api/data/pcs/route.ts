import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { ensureSchema } from '@/lib/schema';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';

// Ensure Node.js runtime and disable caching for fresh reads/writes
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Generic interface for items with id
const TABLE = 'pcs';
const JUNCTION = 'pc_factions';

function rowToPC(row: Record<string, unknown>, factions: string[]) {
  return {
    id: String(row.id),
    name: sanitizeText(row.name),
    nickname: sanitizeOptionalText(row.nickname),
    race: sanitizeText(row.race),
    hometown: sanitizeText(row.hometown),
    status: sanitizeText(row.status),
    class: sanitizeText(row.class),
    image: sanitizeOptionalText(row.image),
    gif: sanitizeOptionalText(row.gif),
    // Keep null instead of stringifying null/undefined so user mapping works
    player: row.player === null || row.player === undefined ? null : sanitizeText(row.player),
    gm_notes: sanitizeOptionalText(row.gm_notes),
    factions,
  };
}

export async function GET(request: NextRequest) {
  const authResult = await verifyRequestAuth(request);
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    await ensureSchema();
    const db = getDb();
    await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE} (
          id INTEGER PRIMARY KEY,
          name TEXT,
          nickname TEXT,
          race TEXT,
          hometown TEXT,
          status TEXT,
          class TEXT,
          image TEXT,
          gif TEXT,
          player TEXT,
          gm_notes TEXT
        )`);
    await db.execute(`CREATE TABLE IF NOT EXISTS ${JUNCTION} (pc_id INTEGER NOT NULL, faction_id INTEGER NOT NULL, PRIMARY KEY(pc_id,faction_id))`);
    const base = await db.execute(`SELECT * FROM ${TABLE}`);
    const jf = await db.execute(`SELECT pc_id, faction_id FROM ${JUNCTION}`);
    const byPc = new Map<number, string[]>();
    for (const r of jf.rows as unknown[]) {
      const row = r as Record<string, unknown>;
      const pid = Number(row.pc_id);
      const fid = String(row.faction_id);
      if (!byPc.has(pid)) byPc.set(pid, []);
      byPc.get(pid)!.push(fid);
    }
    const out = (base.rows as unknown[]).map(r => rowToPC(r as Record<string, unknown>, byPc.get(Number((r as Record<string, unknown>).id)) ?? []));
    return NextResponse.json(out);
  } catch (error) {
    console.error('Error reading PCs file:', error);
    return NextResponse.json({ error: 'Failed to load PCs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    await ensureSchema();
    const db = getDb();
    const body = await request.json();
    const factions: string[] = Array.isArray(body.factions) ? body.factions : [];
    const tx = await db.transaction('write');
    try {
      const res = await tx.execute({
        sql: `INSERT INTO ${TABLE} (name,nickname,race,hometown,status,class,image,gif,player,gm_notes) VALUES (?,?,?,?,?,?,?,?,?,?)`,
        args: [body.name ?? null, body.nickname ?? null, body.race ?? null, body.hometown ?? null, body.status ?? null, body.class ?? null, body.image ?? null, body.gif ?? null, body.player ?? null, body.gm_notes ?? null]
      });
      const newId = Number(res.lastInsertRowid ?? 0);
      for (const fid of factions) await tx.execute({ sql: `INSERT OR IGNORE INTO ${JUNCTION} (pc_id,faction_id) VALUES (?,?)`, args: [newId, Number(fid)] });
      await tx.commit();
      return NextResponse.json({ success: true, data: { ...body, id: String(newId) } });
    } catch (e) { await tx.rollback(); throw e; }
  } catch (error) {
    console.error('Error creating PC:', error);
    return NextResponse.json({ error: 'Failed to create PC' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    await ensureSchema();
    const db = getDb();
    const body = await request.json();
    const idNum = Number(body.id);
    const factions: string[] = Array.isArray(body.factions) ? body.factions : [];
    const tx = await db.transaction('write');
    try {
      const res = await tx.execute({
        sql: `UPDATE ${TABLE} SET name=?,nickname=?,race=?,hometown=?,status=?,class=?,image=?,gif=?,player=?,gm_notes=? WHERE id=?`,
        args: [body.name ?? null, body.nickname ?? null, body.race ?? null, body.hometown ?? null, body.status ?? null, body.class ?? null, body.image ?? null, body.gif ?? null, body.player ?? null, body.gm_notes ?? null, idNum]
      });
      if ((res.rowsAffected ?? 0) === 0) { await tx.rollback(); return NextResponse.json({ error: 'PC not found' }, { status: 404 }); }
      await tx.execute({ sql: `DELETE FROM ${JUNCTION} WHERE pc_id=?`, args: [idNum] });
      for (const fid of factions) await tx.execute({ sql: `INSERT OR IGNORE INTO ${JUNCTION} (pc_id,faction_id) VALUES (?,?)`, args: [idNum, Number(fid)] });
      await tx.commit();
      return NextResponse.json({ success: true, data: body });
    } catch (e) { await tx.rollback(); throw e; }
  } catch (error) {
    console.error('Error updating PC:', error);
    return NextResponse.json({ error: 'Failed to update PC' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    await ensureSchema();
    const db = getDb();
    const pcsArray = await request.json();
    if (!Array.isArray(pcsArray)) return NextResponse.json({ error: 'Expected an array of PCs' }, { status: 400 });
    const tx = await db.transaction('write');
    try {
      for (const pc of pcsArray) {
        const idNum = Number(pc.id);
        const factions: string[] = Array.isArray(pc.factions) ? pc.factions : [];
        const res = await tx.execute({
          sql: `UPDATE ${TABLE} SET name=?,nickname=?,race=?,hometown=?,status=?,class=?,image=?,gif=?,player=?,gm_notes=? WHERE id=?`,
          args: [pc.name ?? null, pc.nickname ?? null, pc.race ?? null, pc.hometown ?? null, pc.status ?? null, pc.class ?? null, pc.image ?? null, pc.gif ?? null, pc.player ?? null, pc.gm_notes ?? null, idNum]
        });
        if ((res.rowsAffected ?? 0) === 0) {
          const ins = await tx.execute({ sql: `INSERT INTO ${TABLE} (name,nickname,race,hometown,status,class,image,gif,player,gm_notes) VALUES (?,?,?,?,?,?,?,?,?,?)`, args: [pc.name ?? null, pc.nickname ?? null, pc.race ?? null, pc.hometown ?? null, pc.status ?? null, pc.class ?? null, pc.image ?? null, pc.gif ?? null, pc.player ?? null, pc.gm_notes ?? null] });
          pc.id = String(Number(ins.lastInsertRowid ?? 0));
        }
        const useId = Number(pc.id);
        await tx.execute({ sql: `DELETE FROM ${JUNCTION} WHERE pc_id=?`, args: [useId] });
        for (const fid of factions) await tx.execute({ sql: `INSERT OR IGNORE INTO ${JUNCTION} (pc_id,faction_id) VALUES (?,?)`, args: [useId, Number(fid)] });
      }
      await tx.commit();
    } catch (e) { await tx.rollback(); throw e; }
    return NextResponse.json({ success: true, data: pcsArray });
  } catch (error) {
    console.error('Error updating PCs array:', error);
    return NextResponse.json({ error: 'Failed to update PCs' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ("errorResponse" in authResult) return authResult.errorResponse;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'PC ID is required' }, { status: 400 });
    const idNum = Number(id);
    const res = await db.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [idNum] });
    if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'PC not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PC:', error);
    return NextResponse.json({ error: 'Failed to delete PC' }, { status: 500 });
  }
}
