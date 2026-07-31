import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';
import { filterForRole, notFound, requireId, withErrorHandling } from '@/lib/apiHelpers';

// Interface for timeline event data
interface TimelineEvent { id: string; title: string; date: string; description: string; category?: string; gm_notes?: string }
const TABLE = 'timeline';

export async function GET(request?: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const res = await db.execute(`SELECT * FROM ${TABLE}`);
        const data = res.rows.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            title: sanitizeText(r.title),
            date: sanitizeText(r.date),
            description: sanitizeText(r.description),
            category: sanitizeOptionalText(r.category),
            gm_notes: sanitizeOptionalText(r.gm_notes)
        }));
        return NextResponse.json(filterForRole(data, authResult.user?.role ?? null));
    }, 'Error reading Timeline file:', 'Failed to load Timeline');
}

export async function POST(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const e = await request.json();
        const res = await db.execute({ sql: `INSERT INTO ${TABLE} (title,date,description,category,gm_notes) VALUES (?,?,?,?,?)`, args: [e.title, e.date, e.description, e.category ?? null, e.gm_notes ?? null] });
        const newId = Number(res.lastInsertRowid ?? 0);
        return NextResponse.json({ success: true, data: { ...e, id: String(newId) } });
    }, 'Error creating Timeline event:', 'Failed to create Timeline event');
}

export async function PUT(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const e: TimelineEvent = await request.json();
        const res = await db.execute({ sql: `UPDATE ${TABLE} SET title=?,date=?,description=?,category=?,gm_notes=? WHERE id=?`, args: [e.title, e.date, e.description, e.category ?? null, e.gm_notes ?? null, Number(e.id)] });
        if ((res.rowsAffected ?? 0) === 0) return notFound('Timeline event not found');
        return NextResponse.json({ success: true, data: e });
    }, 'Error updating Timeline event:', 'Failed to update Timeline event');
}

export async function DELETE(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const idResult = requireId(searchParams, 'Timeline event ID is required');
        if ('error' in idResult) return idResult.error;
        const res = await db.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [Number(idResult.id)] });
        if ((res.rowsAffected ?? 0) === 0) return notFound('Timeline event not found');
        return NextResponse.json({ success: true });
    }, 'Error deleting Timeline event:', 'Failed to delete Timeline event');
}
