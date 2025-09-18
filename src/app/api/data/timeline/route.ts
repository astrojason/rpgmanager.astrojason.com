import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { ensureSchema } from '@/lib/schema';

// Interface for timeline event data
interface TimelineEvent { id: string; title: string; date: string; description: string; category?: string; gm_notes?: string }
const TABLE = 'timeline';

export async function GET() {
    try {
        await ensureSchema();
        const db = getDb();
        await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE} (id INTEGER PRIMARY KEY, title TEXT, date TEXT, description TEXT, category TEXT, gm_notes TEXT)`);
        const res = await db.execute(`SELECT * FROM ${TABLE}`);
        const data = res.rows.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            title: r.title !== undefined ? String(r.title) : '',
            date: r.date !== undefined ? String(r.date) : '',
            description: r.description !== undefined ? String(r.description) : '',
            category: r.category !== undefined ? String(r.category) : undefined,
            gm_notes: r.gm_notes !== undefined ? String(r.gm_notes) : undefined
        }));
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading Timeline file:', error);
        return NextResponse.json({ error: 'Failed to load Timeline' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        await ensureSchema();
        const db = getDb();
        const e = await request.json();
        const res = await db.execute({ sql: `INSERT INTO ${TABLE} (title,date,description,category,gm_notes) VALUES (?,?,?,?,?)`, args: [e.title, e.date, e.description, e.category ?? null, e.gm_notes ?? null] });
        const newId = Number(res.lastInsertRowid ?? 0);
        return NextResponse.json({ success: true, data: { ...e, id: String(newId) } });
    } catch (error) {
        console.error('Error creating Timeline event:', error);
        return NextResponse.json({ error: 'Failed to create Timeline event' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        await ensureSchema();
        const db = getDb();
        const e: TimelineEvent = await request.json();
        const res = await db.execute({ sql: `UPDATE ${TABLE} SET title=?,date=?,description=?,category=?,gm_notes=? WHERE id=?`, args: [e.title, e.date, e.description, e.category ?? null, e.gm_notes ?? null, Number(e.id)] });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Timeline event not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: e });
    } catch (error) {
        console.error('Error updating Timeline event:', error);
        return NextResponse.json({ error: 'Failed to update Timeline event' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await ensureSchema();
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Timeline event ID is required' }, { status: 400 });
        const res = await db.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [Number(id)] });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Timeline event not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Timeline event:', error);
        return NextResponse.json({ error: 'Failed to delete Timeline event' }, { status: 500 });
    }
}
