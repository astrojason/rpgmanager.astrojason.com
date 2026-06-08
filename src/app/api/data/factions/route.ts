import { NextRequest, NextResponse } from 'next/server';
import { Faction } from '@/types/interfaces';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { safeImageSrc, sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';

const TABLE = 'factions';

export async function GET(request?: NextRequest) {
  const authResult = await verifyRequestAuth(request);
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    const db = getDb();
    const res = await db.execute(`SELECT * FROM ${TABLE}`);
    const data = res.rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      name: sanitizeText(r.name),
      pronunciation: sanitizeText(r.pronunciation),
      type: sanitizeText(r.type),
      description: sanitizeText(r.description),
      location: sanitizeText(r.location),
      status: sanitizeText(r.status),
      goals: sanitizeText(r.goals),
      background: sanitizeOptionalText(r.background),
      relationships: r.relationships ? JSON.parse(String(r.relationships)) : undefined,
      image: safeImageSrc(r.image),
      gm_notes: sanitizeOptionalText(r.gm_notes),
      notes: r.notes ? JSON.parse(String(r.notes)) : [],
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
    const db = getDb();
    const f: Faction = await request.json();
    if (!f.id) {
      const gt = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
      f.id = gt.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    await db.execute({
      sql: `INSERT INTO ${TABLE} (id,name,pronunciation,type,description,location,status,goals,background,relationships,image,gm_notes,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        f.id, f.name, f.pronunciation, f.type, f.description, f.location, f.status,
        f.goals, f.background ?? null, JSON.stringify(f.relationships ?? null), f.image ?? null, f.gm_notes ?? null, JSON.stringify(f.notes ?? [])
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
    const db = getDb();
    const f: Faction = await request.json();
    const res = await db.execute({
      sql: `UPDATE ${TABLE} SET name=?,pronunciation=?,type=?,description=?,location=?,status=?,goals=?,background=?,relationships=?,image=?,gm_notes=?,notes=? WHERE id=?`,
      args: [
        f.name, f.pronunciation, f.type, f.description, f.location, f.status,
        f.goals, f.background ?? null, JSON.stringify(f.relationships ?? null), f.image ?? null, f.gm_notes ?? null, JSON.stringify(f.notes ?? []), f.id
      ]
    });
    if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Faction not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: f });
  } catch (error) {
    console.error('Error updating Faction:', error);
    return NextResponse.json({ error: 'Failed to update Faction' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await verifyRequestAuth(request);
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    const db = getDb();
    const body: { id?: string; notes?: unknown[] } = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Faction ID is required' }, { status: 400 });

    const res = await db.execute({
      sql: `UPDATE ${TABLE} SET notes=? WHERE id=?`,
      args: [JSON.stringify(body.notes ?? []), body.id],
    });
    if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Faction not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating Faction notes:', error);
    return NextResponse.json({ error: 'Failed to update Faction notes' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
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
