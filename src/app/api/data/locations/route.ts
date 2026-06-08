import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { safeImageSrc, sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';

const TABLE = 'locations';

export async function GET(request?: NextRequest) {
  const authResult = await verifyRequestAuth(request);
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    const db = getDb();
    const res = await db.execute(`SELECT * FROM ${TABLE}`);
    const data = res.rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      name: sanitizeText(r.name),
      pronunciation: sanitizeOptionalText(r.pronunciation),
      mapImg: safeImageSrc(r.mapImg),
      x: r.x != null ? Number(r.x) : undefined,
      y: r.y != null ? Number(r.y) : undefined,
      width: r.width != null ? Number(r.width) : undefined,
      height: r.height != null ? Number(r.height) : undefined,
      teaser: sanitizeText(r.teaser),
      detail: sanitizeText(r.detail),
      gm_notes: sanitizeOptionalText(r.gm_notes),
      notes: r.notes ? JSON.parse(String(r.notes)) : [],
      locations: r.locations ? JSON.parse(String(r.locations)) : undefined,
    }));
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading Locations file:', error);
    return NextResponse.json({ error: 'Failed to load Locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    const db = getDb();
    const l = await request.json();
    const res = await db.execute({
      sql: `INSERT INTO ${TABLE} (name,pronunciation,mapImg,x,y,width,height,teaser,detail,gm_notes,locations,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [l.name, l.pronunciation ?? null, l.mapImg ?? null, l.x ?? null, l.y ?? null, l.width ?? null, l.height ?? null, l.teaser, l.detail, l.gm_notes ?? null, JSON.stringify(l.locations ?? null), JSON.stringify(l.notes ?? [])]
    });
    const newId = Number(res.lastInsertRowid ?? 0);
    return NextResponse.json({ success: true, data: { ...l, id: String(newId) } });
  } catch (error) {
    console.error('Error creating Location:', error);
    return NextResponse.json({ error: 'Failed to create Location' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    const db = getDb();
    const l = await request.json();
    const idNum = Number(l.id);
    const res = await db.execute({
      sql: `UPDATE ${TABLE} SET name=?,pronunciation=?,mapImg=?,x=?,y=?,width=?,height=?,teaser=?,detail=?,gm_notes=?,locations=?,notes=? WHERE id=?`,
      args: [l.name, l.pronunciation ?? null, l.mapImg ?? null, l.x ?? null, l.y ?? null, l.width ?? null, l.height ?? null, l.teaser, l.detail, l.gm_notes ?? null, JSON.stringify(l.locations ?? null), JSON.stringify(l.notes ?? []), idNum]
    });
    if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: l });
  } catch (error) {
    console.error('Error updating Location:', error);
    return NextResponse.json({ error: 'Failed to update Location' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await verifyRequestAuth(request);
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    const db = getDb();
    const body: { id?: string; notes?: unknown[] } = await request.json();
    if (!body.id) return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });

    const res = await db.execute({
      sql: `UPDATE ${TABLE} SET notes=? WHERE id=?`,
      args: [JSON.stringify(body.notes ?? []), Number(body.id)],
    });
    if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating Location notes:', error);
    return NextResponse.json({ error: 'Failed to update Location notes' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    const res = await db.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [Number(id)] });
    if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting Location:', error);
    return NextResponse.json({ error: 'Failed to delete Location' }, { status: 500 });
  }
}
