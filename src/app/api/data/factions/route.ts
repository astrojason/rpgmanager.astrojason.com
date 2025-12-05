import { NextRequest, NextResponse } from 'next/server';
import { Faction } from '@/types/interfaces';
import { getDb } from '@/lib/turso';
import { ensureSchema } from '@/lib/schema';
import { verifyRequestAuth } from '@/lib/apiAuth';

const TABLE = 'factions';

export async function GET(request: NextRequest) {
  const authResult = await verifyRequestAuth(request);
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    await ensureSchema();
    const db = getDb();
    await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE} (
          id TEXT PRIMARY KEY,
          name TEXT,
          pronunciation TEXT,
          type TEXT,
          description TEXT,
          location TEXT,
          status TEXT,
          goals TEXT,
          background TEXT,
          relationships TEXT,
          image TEXT,
          gm_notes TEXT
        )`);
    const res = await db.execute(`SELECT * FROM ${TABLE}`);
    const data = res.rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      name: String(r.name ?? ''),
      pronunciation: String(r.pronunciation ?? ''),
      type: String(r.type ?? ''),
      description: String(r.description ?? ''),
      location: String(r.location ?? ''),
      status: String(r.status ?? ''),
      goals: String(r.goals ?? ''),
      background: String(r.background ?? ''),
      relationships: r.relationships ? JSON.parse(String(r.relationships)) : undefined,
      image: r.image ? String(r.image) : undefined,
      gm_notes: r.gm_notes ? String(r.gm_notes) : undefined,
    } as Faction));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading Factions file:', error);
    return NextResponse.json({ error: 'Failed to load Factions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    await ensureSchema();
    const db = getDb();
    const f: Faction = await request.json();
    if (!f.id) {
      const gt = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
      f.id = gt.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    await db.execute({
      sql: `INSERT INTO ${TABLE} (id,name,pronunciation,type,description,location,status,goals,background,relationships,image,gm_notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        f.id, f.name, f.pronunciation, f.type, f.description, f.location, f.status,
        f.goals, f.background ?? null, JSON.stringify(f.relationships ?? null), f.image ?? null, f.gm_notes ?? null
      ]
    });
    return NextResponse.json({ success: true, data: f });
  } catch (error) {
    console.error('Error creating Faction:', error);
    return NextResponse.json({ error: 'Failed to create Faction' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    await ensureSchema();
    const db = getDb();
    const f: Faction = await request.json();
    const res = await db.execute({
      sql: `UPDATE ${TABLE} SET name=?,pronunciation=?,type=?,description=?,location=?,status=?,goals=?,background=?,relationships=?,image=?,gm_notes=? WHERE id=?`,
      args: [
        f.name, f.pronunciation, f.type, f.description, f.location, f.status,
        f.goals, f.background ?? null, JSON.stringify(f.relationships ?? null), f.image ?? null, f.gm_notes ?? null, f.id
      ]
    });
    if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Faction not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: f });
  } catch (error) {
    console.error('Error updating Faction:', error);
    return NextResponse.json({ error: 'Failed to update Faction' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    await ensureSchema();
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Faction ID is required' }, { status: 400 });
    const res = await db.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [id] });
    if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Faction not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Faction:', error);
    return NextResponse.json({ error: 'Failed to delete Faction' }, { status: 500 });
  }
}
