import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { ensureSchema } from '@/lib/schema';
import { SessionRecap } from '@/types/interfaces';
import { verifyRequestAuth } from '@/lib/apiAuth';

async function loadTagMaps(db: ReturnType<typeof getDb>) {
    const npcRows = await db.execute(`SELECT recap_id, npc_id FROM recap_npcs`);
    const locRows = await db.execute(`SELECT recap_id, location_id FROM recap_locations`);
    const questRows = await db.execute(`SELECT recap_id, quest_id FROM recap_quests`);
    const itemRows = await db.execute(`SELECT recap_id, item_id FROM recap_items`);
    const factionRows = await db.execute(`SELECT recap_id, faction_id FROM recap_factions`);
    const deityRows = await db.execute(`SELECT recap_id, deity_id FROM recap_deities`);

    function buildMap(rows: Record<string, unknown>[], keyCol: string, valCol: string): Map<string, string[]> {
        const m = new Map<string, string[]>();
        for (const r of rows) {
            const key = String(r[keyCol]);
            if (!m.has(key)) m.set(key, []);
            m.get(key)!.push(String(r[valCol]));
        }
        return m;
    }

    return {
        npcMap: buildMap(npcRows.rows as Record<string, unknown>[], 'recap_id', 'npc_id'),
        locMap: buildMap(locRows.rows as Record<string, unknown>[], 'recap_id', 'location_id'),
        questMap: buildMap(questRows.rows as Record<string, unknown>[], 'recap_id', 'quest_id'),
        itemMap: buildMap(itemRows.rows as Record<string, unknown>[], 'recap_id', 'item_id'),
        factionMap: buildMap(factionRows.rows as Record<string, unknown>[], 'recap_id', 'faction_id'),
        deityMap: buildMap(deityRows.rows as Record<string, unknown>[], 'recap_id', 'deity_id'),
    };
}

async function replaceTagsForRecap(
    db: ReturnType<typeof getDb>,
    recapId: string | number,
    npcs: string[], locations: string[], quests: string[], items: string[],
    factions: string[] = [], deities: string[] = []
) {
    const id = Number(recapId);
    await db.execute({ sql: `DELETE FROM recap_npcs WHERE recap_id=?`, args: [id] });
    await db.execute({ sql: `DELETE FROM recap_locations WHERE recap_id=?`, args: [id] });
    await db.execute({ sql: `DELETE FROM recap_quests WHERE recap_id=?`, args: [id] });
    await db.execute({ sql: `DELETE FROM recap_items WHERE recap_id=?`, args: [id] });
    await db.execute({ sql: `DELETE FROM recap_factions WHERE recap_id=?`, args: [id] });
    await db.execute({ sql: `DELETE FROM recap_deities WHERE recap_id=?`, args: [id] });
    for (const npcId of npcs) {
        await db.execute({ sql: `INSERT OR IGNORE INTO recap_npcs (recap_id, npc_id) VALUES (?,?)`, args: [id, Number(npcId)] });
    }
    for (const locId of locations) {
        await db.execute({ sql: `INSERT OR IGNORE INTO recap_locations (recap_id, location_id) VALUES (?,?)`, args: [id, locId] });
    }
    for (const questId of quests) {
        await db.execute({ sql: `INSERT OR IGNORE INTO recap_quests (recap_id, quest_id) VALUES (?,?)`, args: [id, Number(questId)] });
    }
    for (const itemId of items) {
        await db.execute({ sql: `INSERT OR IGNORE INTO recap_items (recap_id, item_id) VALUES (?,?)`, args: [id, Number(itemId)] });
    }
    for (const factionId of factions) {
        await db.execute({ sql: `INSERT OR IGNORE INTO recap_factions (recap_id, faction_id) VALUES (?,?)`, args: [id, factionId] });
    }
    for (const deityId of deities) {
        await db.execute({ sql: `INSERT OR IGNORE INTO recap_deities (recap_id, deity_id) VALUES (?,?)`, args: [id, Number(deityId)] });
    }
}

// Interface for session recap data
// Note: extended SessionRecap interface is imported

const TABLE = 'session_recaps';

export async function GET(request?: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        await ensureSchema();
        const db = getDb();
        await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE} (id INTEGER PRIMARY KEY, date TEXT, title TEXT, recap TEXT, author TEXT, notes TEXT)`);
        const res = await db.execute(`SELECT * FROM ${TABLE}`);
        const { npcMap, locMap, questMap, itemMap, factionMap, deityMap } = await loadTagMaps(db);
        const data: SessionRecap[] = res.rows.map((r: Record<string, unknown>) => {
            const id = String(r.id);
            return {
                id,
                date: r.date !== undefined ? String(r.date) : '',
                title: r.title !== undefined ? String(r.title) : '',
                recap: r.recap !== undefined ? String(r.recap) : '',
                author: r.author !== undefined ? String(r.author) : undefined,
                notes: r.notes ? JSON.parse(String(r.notes)) : [],
                tagged_npcs: npcMap.get(id) ?? [],
                tagged_locations: locMap.get(id) ?? [],
                tagged_quests: questMap.get(id) ?? [],
                tagged_items: itemMap.get(id) ?? [],
                tagged_factions: factionMap.get(id) ?? [],
                tagged_deities: deityMap.get(id) ?? [],
            };
        });
        // Auto-migrate: add ids and defaults
        let mutated = false;
        const used = new Set<string>();
        for (const r of data) if (r.id) used.add(r.id);
        const genUUID = () => {
            const gt = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
            const g = gt.crypto?.randomUUID?.bind(gt.crypto);
            if (g) return g();
            const rnd = (n = 16) => Array.from({ length: n }, () => (Math.random() * 256) | 0);
            const bytes = rnd(16);
            bytes[6] = (bytes[6] & 0x0f) | 0x40;
            bytes[8] = (bytes[8] & 0x3f) | 0x80;
            const hex = bytes.map((b) => b.toString(16).padStart(2, '0'));
            return (
                hex.slice(0, 4).join('') + '-' +
                hex.slice(4, 6).join('') + '-' +
                hex.slice(6, 8).join('') + '-' +
                hex.slice(8, 10).join('') + '-' +
                hex.slice(10, 16).join('')
            );
        };
        for (const recap of data) {
            if (!recap.id) {
                let id: string;
                do { id = genUUID(); } while (used.has(id));
                recap.id = id; used.add(id); mutated = true;
            }
            if (!Array.isArray(recap.notes)) {
                recap.notes = [];
                mutated = true;
            }
        }
        if (mutated) {
            const tx = await db.transaction('write');
            try {
                await tx.execute(`DELETE FROM ${TABLE}`);
                for (const r of data) {
                    const id = r.id ?? '';
                    const date = r.date ?? '';
                    const title = r.title ?? '';
                    const recap = r.recap ?? '';
                    const author = typeof r.author === 'string' ? r.author : null;
                    const notes = JSON.stringify(r.notes ?? []);
                    await tx.execute({
                        sql: `INSERT INTO ${TABLE} (id,date,title,recap,author,notes) VALUES (?,?,?,?,?,?)`,
                        args: [id, date, title, recap, author, notes]
                    });
                }
                await tx.commit();
            } catch (e) {
                await tx.rollback();
                throw e;
            }
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading Session Recaps file:', error);
        return NextResponse.json({ error: 'Failed to load Session Recaps' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        await ensureSchema();
        const db = getDb();
        const newRecap: SessionRecap = await request.json();
        if (!Array.isArray(newRecap.notes)) newRecap.notes = [];
        const res = await db.execute({ sql: `INSERT INTO ${TABLE} (date,title,recap,author,notes) VALUES (?,?,?,?,?)`, args: [newRecap.date, newRecap.title, newRecap.recap, newRecap.author ?? null, JSON.stringify(newRecap.notes ?? [])] });
        const newId = Number(res.lastInsertRowid ?? 0);
        await replaceTagsForRecap(db, newId, newRecap.tagged_npcs ?? [], newRecap.tagged_locations ?? [], newRecap.tagged_quests ?? [], newRecap.tagged_items ?? [], newRecap.tagged_factions ?? [], newRecap.tagged_deities ?? []);
        return NextResponse.json({ success: true, data: { ...newRecap, id: String(newId) } });
    } catch (error) {
        console.error('Error creating Session Recap:', error);
        return NextResponse.json({ error: 'Failed to create Session Recap' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        await ensureSchema();
        const db = getDb();
        const updatedRecap: SessionRecap = await request.json();
        // Load all recaps to find the one to update
        const res = await db.execute(`SELECT * FROM ${TABLE}`);
        const recaps: SessionRecap[] = res.rows.map((r: Record<string, unknown>) => ({
            id: String(r.id),
            date: r.date !== undefined ? String(r.date) : '',
            title: r.title !== undefined ? String(r.title) : '',
            recap: r.recap !== undefined ? String(r.recap) : '',
            author: r.author !== undefined ? String(r.author) : undefined,
            notes: r.notes ? JSON.parse(String(r.notes)) : []
        }));
        let index = -1;
        if (updatedRecap.id) {
            index = recaps.findIndex((recap: SessionRecap) => recap.id === updatedRecap.id);
        }
        if (index === -1) {
            index = recaps.findIndex((recap: SessionRecap) => recap.date === updatedRecap.date && recap.title === updatedRecap.title);
        }
        if (index === -1) {
            return NextResponse.json({ error: 'Session Recap not found' }, { status: 404 });
        }
        await db.execute({ sql: `UPDATE ${TABLE} SET date=?,title=?,recap=?,author=?,notes=? WHERE id=?`, args: [updatedRecap.date, updatedRecap.title, updatedRecap.recap, updatedRecap.author || null, JSON.stringify(updatedRecap.notes ?? []), Number(updatedRecap.id)] });
        await replaceTagsForRecap(db, updatedRecap.id!, updatedRecap.tagged_npcs ?? [], updatedRecap.tagged_locations ?? [], updatedRecap.tagged_quests ?? [], updatedRecap.tagged_items ?? [], updatedRecap.tagged_factions ?? [], updatedRecap.tagged_deities ?? []);
        return NextResponse.json({ success: true, data: updatedRecap });
    } catch (error) {
        console.error('Error updating Session Recap:', error);
        return NextResponse.json({ error: 'Failed to update Session Recap' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        await ensureSchema();
        const db = getDb();
        const body: { id?: string; notes?: unknown[] } = await request.json();
        if (!body.id) return NextResponse.json({ error: 'Recap ID is required' }, { status: 400 });

        const res = await db.execute({
            sql: `UPDATE ${TABLE} SET notes=? WHERE id=?`,
            args: [JSON.stringify(body.notes ?? []), Number(body.id)],
        });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Recap not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating recap notes:', error);
        return NextResponse.json({ error: 'Failed to update recap notes' }, { status: 500 });
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
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        await db.execute({ sql: `DELETE FROM recap_npcs WHERE recap_id=?`, args: [Number(id)] });
        await db.execute({ sql: `DELETE FROM recap_locations WHERE recap_id=?`, args: [Number(id)] });
        await db.execute({ sql: `DELETE FROM recap_quests WHERE recap_id=?`, args: [Number(id)] });
        await db.execute({ sql: `DELETE FROM recap_items WHERE recap_id=?`, args: [Number(id)] });
        await db.execute({ sql: `DELETE FROM recap_factions WHERE recap_id=?`, args: [Number(id)] });
        await db.execute({ sql: `DELETE FROM recap_deities WHERE recap_id=?`, args: [Number(id)] });
        const res = await db.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [Number(id)] });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Session Recap not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Session Recap:', error);
        return NextResponse.json({ error: 'Failed to delete Session Recap' }, { status: 500 });
    }
}
