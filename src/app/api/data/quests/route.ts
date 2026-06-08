import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';

const TABLE = 'quests';

async function loadQuestTagMaps(db: ReturnType<typeof getDb>) {
    const npcRows = await db.execute(`SELECT quest_id, npc_id FROM quest_npcs`);
    const locRows = await db.execute(`SELECT quest_id, location_id FROM quest_locations`);
    const factionRows = await db.execute(`SELECT quest_id, faction_id FROM quest_factions`);
    const deityRows = await db.execute(`SELECT quest_id, deity_id FROM quest_deities`);

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
        npcMap: buildMap(npcRows.rows as Record<string, unknown>[], 'quest_id', 'npc_id'),
        locMap: buildMap(locRows.rows as Record<string, unknown>[], 'quest_id', 'location_id'),
        factionMap: buildMap(factionRows.rows as Record<string, unknown>[], 'quest_id', 'faction_id'),
        deityMap: buildMap(deityRows.rows as Record<string, unknown>[], 'quest_id', 'deity_id'),
    };
}

async function replaceTagsForQuest(
    db: ReturnType<typeof getDb>,
    questId: string | number,
    npcs: string[], locations: string[],
    factions: string[] = [], deities: string[] = []
) {
    const id = Number(questId);
    await db.execute({ sql: `DELETE FROM quest_npcs WHERE quest_id=?`, args: [id] });
    await db.execute({ sql: `DELETE FROM quest_locations WHERE quest_id=?`, args: [id] });
    await db.execute({ sql: `DELETE FROM quest_factions WHERE quest_id=?`, args: [id] });
    await db.execute({ sql: `DELETE FROM quest_deities WHERE quest_id=?`, args: [id] });
    for (const npcId of npcs) {
        await db.execute({ sql: `INSERT OR IGNORE INTO quest_npcs (quest_id, npc_id) VALUES (?,?)`, args: [id, Number(npcId)] });
    }
    for (const locId of locations) {
        await db.execute({ sql: `INSERT OR IGNORE INTO quest_locations (quest_id, location_id) VALUES (?,?)`, args: [id, locId] });
    }
    for (const factionId of factions) {
        await db.execute({ sql: `INSERT OR IGNORE INTO quest_factions (quest_id, faction_id) VALUES (?,?)`, args: [id, factionId] });
    }
    for (const deityId of deities) {
        await db.execute({ sql: `INSERT OR IGNORE INTO quest_deities (quest_id, deity_id) VALUES (?,?)`, args: [id, Number(deityId)] });
    }
}

export async function GET(request?: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        const db = getDb();
        const res = await db.execute(`SELECT * FROM ${TABLE}`);
        const { npcMap, locMap, factionMap, deityMap } = await loadQuestTagMaps(db);
        const data = res.rows.map((r: Record<string, unknown>) => {
            const id = String(r.id);
            return {
                id,
                name: sanitizeText(r.name),
                notes: r.notes ? JSON.parse(String(r.notes)) : [],
                status: sanitizeText(r.status) || 'active',
                gm_notes: sanitizeOptionalText(r.gm_notes),
                tagged_npcs: npcMap.get(id) ?? [],
                tagged_locations: locMap.get(id) ?? [],
                tagged_factions: factionMap.get(id) ?? [],
                tagged_deities: deityMap.get(id) ?? [],
            };
        });
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
        const db = getDb();
        const q = await request.json();
        const res = await db.execute({ sql: `INSERT INTO ${TABLE} (name,notes,status,gm_notes) VALUES (?,?,?,?)`, args: [q.name, JSON.stringify(q.notes ?? []), q.status ?? 'active', q.gm_notes ?? null] });
        const newId = Number(res.lastInsertRowid ?? 0);
        await replaceTagsForQuest(db, newId, q.tagged_npcs ?? [], q.tagged_locations ?? [], q.tagged_factions ?? [], q.tagged_deities ?? []);
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
        const db = getDb();
        const q = await request.json();
        const res = await db.execute({ sql: `UPDATE ${TABLE} SET name=?,notes=?,status=?,gm_notes=? WHERE id=?`, args: [q.name, JSON.stringify(q.notes ?? []), q.status ?? 'active', q.gm_notes ?? null, Number(q.id)] });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
        await replaceTagsForQuest(db, q.id, q.tagged_npcs ?? [], q.tagged_locations ?? [], q.tagged_factions ?? [], q.tagged_deities ?? []);
        return NextResponse.json({ success: true, data: q });
    } catch (error) {
        console.error('Error updating Quest:', error);
        return NextResponse.json({ error: 'Failed to update Quest' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        const db = getDb();
        const body: { id?: string; notes?: unknown[] } = await request.json();
        if (!body.id) return NextResponse.json({ error: 'Quest ID is required' }, { status: 400 });

        const res = await db.execute({
            sql: `UPDATE ${TABLE} SET notes=? WHERE id=?`,
            args: [JSON.stringify(body.notes ?? []), Number(body.id)],
        });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating Quest notes:', error);
        return NextResponse.json({ error: 'Failed to update Quest notes' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'Quest ID is required' }, { status: 400 });
        await db.execute({ sql: `DELETE FROM quest_npcs WHERE quest_id=?`, args: [Number(id)] });
        await db.execute({ sql: `DELETE FROM quest_locations WHERE quest_id=?`, args: [Number(id)] });
        await db.execute({ sql: `DELETE FROM quest_factions WHERE quest_id=?`, args: [Number(id)] });
        await db.execute({ sql: `DELETE FROM quest_deities WHERE quest_id=?`, args: [Number(id)] });
        const res = await db.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [Number(id)] });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Quest:', error);
        return NextResponse.json({ error: 'Failed to delete Quest' }, { status: 500 });
    }
}
