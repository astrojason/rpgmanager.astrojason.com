import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { ensureSchema } from '@/lib/schema';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';

// Generic interface for items with id
const TABLE = 'quests';

export async function GET(request?: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        await ensureSchema();
        const db = getDb();
        await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE} (id INTEGER PRIMARY KEY, name TEXT, notes TEXT, status TEXT, gm_notes TEXT)`);
        const res = await db.execute(`SELECT * FROM ${TABLE}`);
        const data = res.rows.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            name: sanitizeText(r.name),
            notes: r.notes ? JSON.parse(String(r.notes)) : [],
            status: sanitizeText(r.status) || 'active',
            gm_notes: sanitizeOptionalText(r.gm_notes)
        }));
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading Quests file:', error);
        return NextResponse.json({ error: 'Failed to load Quests' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        await ensureSchema();
        const db = getDb();
        const q = await request.json();
        const res = await db.execute({ sql: `INSERT INTO ${TABLE} (name,notes,status,gm_notes) VALUES (?,?,?,?)`, args: [q.name, JSON.stringify(q.notes ?? []), q.status ?? 'active', q.gm_notes ?? null] });
        const newId = Number(res.lastInsertRowid ?? 0);
        return NextResponse.json({ success: true, data: { ...q, id: String(newId) } });
    } catch (error) {
        console.error('Error creating Quest:', error);
        return NextResponse.json({ error: 'Failed to create Quest' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        await ensureSchema();
        const db = getDb();
        const q = await request.json();
        const res = await db.execute({ sql: `UPDATE ${TABLE} SET name=?,notes=?,status=?,gm_notes=? WHERE id=?`, args: [q.name, JSON.stringify(q.notes ?? []), q.status ?? 'active', q.gm_notes ?? null, Number(q.id)] });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: q });
    } catch (error) {
        console.error('Error updating Quest:', error);
        return NextResponse.json({ error: 'Failed to update Quest' }, { status: 500 });
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
        if (!id) return NextResponse.json({ error: 'Quest ID is required' }, { status: 400 });
        const res = await db.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [Number(id)] });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Quest:', error);
        return NextResponse.json({ error: 'Failed to delete Quest' }, { status: 500 });
    }
}
