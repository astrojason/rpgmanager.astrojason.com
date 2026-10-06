import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';
import { filterForRole, notFound, requireId, withErrorHandling } from '@/lib/apiHelpers';

interface LoreEntry { id: string; title: string; category?: string; content: string; hidden?: boolean; gm_notes?: string }
const TABLE = 'lore';

export async function GET(request?: NextRequest) {
  const authResult = await verifyRequestAuth(request);
  if ('errorResponse' in authResult) return authResult.errorResponse;

  return withErrorHandling(async () => {
    const db = getDb();
    const res = await db.execute(`SELECT * FROM ${TABLE}`);
    const data = res.rows.map((r: Record<string, unknown>) => ({
      id: String(r.id),
      title: sanitizeText(r.title),
      category: sanitizeOptionalText(r.category),
      content: sanitizeText(r.content),
      hidden: !!r.hidden,
      gm_notes: sanitizeOptionalText(r.gm_notes),
    }));
    return NextResponse.json(filterForRole(data, authResult.user?.role ?? null));
  }, 'Error reading Lore:', 'Failed to load Lore');
}

export async function POST(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  return withErrorHandling(async () => {
    const db = getDb();
    const e = await request.json();
    const res = await db.execute({
      sql: `INSERT INTO ${TABLE} (title,category,content,hidden,gm_notes) VALUES (?,?,?,?,?)`,
      args: [e.title, e.category ?? null, e.content, e.hidden ? 1 : 0, e.gm_notes ?? null],
    });
    const newId = Number(res.lastInsertRowid ?? 0);
    return NextResponse.json({ success: true, data: { ...e, id: String(newId) } });
  }, 'Error creating Lore entry:', 'Failed to create Lore entry');
}

export async function PUT(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  return withErrorHandling(async () => {
    const db = getDb();
    const e: LoreEntry = await request.json();
    const res = await db.execute({
      sql: `UPDATE ${TABLE} SET title=?,category=?,content=?,hidden=?,gm_notes=? WHERE id=?`,
      args: [e.title, e.category ?? null, e.content, e.hidden ? 1 : 0, e.gm_notes ?? null, Number(e.id)],
    });
    if ((res.rowsAffected ?? 0) === 0) return notFound('Lore entry not found');
    return NextResponse.json({ success: true, data: e });
  }, 'Error updating Lore entry:', 'Failed to update Lore entry');
}

export async function DELETE(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  return withErrorHandling(async () => {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const idResult = requireId(searchParams, 'Lore entry ID is required');
    if ('error' in idResult) return idResult.error;
    const res = await db.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [Number(idResult.id)] });
    if ((res.rowsAffected ?? 0) === 0) return notFound('Lore entry not found');
    return NextResponse.json({ success: true });
  }, 'Error deleting Lore entry:', 'Failed to delete Lore entry');
}
