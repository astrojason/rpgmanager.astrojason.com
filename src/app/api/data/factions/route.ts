import { NextRequest, NextResponse } from 'next/server';
import { Faction } from '@/types/interfaces';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { safeImageSrc, sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';
import { filterForRole, notFound, notesPatchHandler, requireId, withErrorHandling } from '@/lib/apiHelpers';

const TABLE = 'factions';

export async function GET(request?: NextRequest) {
  const authResult = await verifyRequestAuth(request);
  if ('errorResponse' in authResult) return authResult.errorResponse;

  return withErrorHandling(async () => {
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
      hidden: !!r.hidden,
      gm_notes: sanitizeOptionalText(r.gm_notes),
      notes: r.notes ? JSON.parse(String(r.notes)) : [],
    } as Faction));
    return NextResponse.json(filterForRole(data, authResult.user?.role ?? null));
  }, 'Error reading Factions file:', 'Failed to load Factions');
}

export async function POST(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  return withErrorHandling(async () => {
    const db = getDb();
    const f: Faction = await request.json();
    const res = await db.execute({
      sql: `INSERT INTO ${TABLE} (name,pronunciation,type,description,location,status,goals,background,relationships,image,hidden,gm_notes,notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        f.name, f.pronunciation ?? null, f.type ?? null, f.description ?? null, f.location ?? null, f.status ?? null,
        f.goals ?? null, f.background ?? null, JSON.stringify(f.relationships ?? null), f.image ?? null, f.hidden ? 1 : 0, f.gm_notes ?? null, JSON.stringify(f.notes ?? [])
      ]
    });
    const newId = Number(res.lastInsertRowid ?? 0);
    return NextResponse.json({ success: true, data: { ...f, id: String(newId) } });
  }, 'Error creating Faction:', 'Failed to create Faction');
}

export async function PUT(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  return withErrorHandling(async () => {
    const db = getDb();
    const f: Faction = await request.json();
    const res = await db.execute({
      sql: `UPDATE ${TABLE} SET name=?,pronunciation=?,type=?,description=?,location=?,status=?,goals=?,background=?,relationships=?,image=?,hidden=?,gm_notes=?,notes=? WHERE id=?`,
      args: [
        f.name, f.pronunciation ?? null, f.type ?? null, f.description ?? null, f.location ?? null, f.status ?? null,
        f.goals ?? null, f.background ?? null, JSON.stringify(f.relationships ?? null), f.image ?? null, f.hidden ? 1 : 0, f.gm_notes ?? null, JSON.stringify(f.notes ?? []), f.id
      ]
    });
    if ((res.rowsAffected ?? 0) === 0) return notFound('Faction not found');
    return NextResponse.json({ success: true, data: f });
  }, 'Error updating Faction:', 'Failed to update Faction');
}

export const PATCH = notesPatchHandler({
  table: TABLE,
  idRequiredMessage: 'Faction ID is required',
  notFoundMessage: 'Faction not found',
  updateFailedMessage: 'Failed to update Faction notes',
  logLabel: 'Error updating Faction notes:',
  idType: 'string',
});

export async function DELETE(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  return withErrorHandling(async () => {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const idResult = requireId(searchParams, 'Faction ID is required');
    if ('error' in idResult) return idResult.error;
    const res = await db.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [idResult.id] });
    if ((res.rowsAffected ?? 0) === 0) return notFound('Faction not found');
    return NextResponse.json({ success: true });
  }, 'Error deleting Faction:', 'Failed to delete Faction');
}
