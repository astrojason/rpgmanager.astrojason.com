import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';
import { filterForRole, notFound, notesPatchHandler, requireId, withErrorHandling } from '@/lib/apiHelpers';

const TABLE = 'quests';

function buildMap(rows: Record<string, unknown>[], keyCol: string, valCol: string): Map<string, string[]> {
    const m = new Map<string, string[]>();
    for (const r of rows) {
        const key = String(r[keyCol]);
        if (!m.has(key)) m.set(key, []);
        m.get(key)!.push(String(r[valCol]));
    }
    return m;
}

async function replaceTagsForQuest(
    db: ReturnType<typeof getDb>,
    questId: string | number,
    npcs: string[], locations: string[],
    factions: string[] = [], deities: string[] = []
) {
    const id = Number(questId);
    await db.batch([
        { sql: `DELETE FROM quest_npcs WHERE quest_id=?`, args: [id] },
        { sql: `DELETE FROM quest_locations WHERE quest_id=?`, args: [id] },
        { sql: `DELETE FROM quest_factions WHERE quest_id=?`, args: [id] },
        { sql: `DELETE FROM quest_deities WHERE quest_id=?`, args: [id] },
        ...npcs.map(npcId => ({ sql: `INSERT OR IGNORE INTO quest_npcs (quest_id, npc_id) VALUES (?,?)`, args: [id, Number(npcId)]  as (string | number | null)[] })),
        ...locations.map(locId => ({ sql: `INSERT OR IGNORE INTO quest_locations (quest_id, location_id) VALUES (?,?)`, args: [id, locId]  as (string | number | null)[] })),
        ...factions.map(factionId => ({ sql: `INSERT OR IGNORE INTO quest_factions (quest_id, faction_id) VALUES (?,?)`, args: [id, factionId]  as (string | number | null)[] })),
        ...deities.map(deityId => ({ sql: `INSERT OR IGNORE INTO quest_deities (quest_id, deity_id) VALUES (?,?)`, args: [id, Number(deityId)]  as (string | number | null)[] })),
    ], "write");
}

export async function GET(request?: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const [res, npcRows, locRows, factionRows, deityRows] = await db.batch([
            `SELECT * FROM ${TABLE}`,
            `SELECT quest_id, npc_id FROM quest_npcs`,
            `SELECT quest_id, location_id FROM quest_locations`,
            `SELECT quest_id, faction_id FROM quest_factions`,
            `SELECT quest_id, deity_id FROM quest_deities`,
        ], "read");
        const npcMap = buildMap(npcRows.rows as Record<string, unknown>[], 'quest_id', 'npc_id');
        const locMap = buildMap(locRows.rows as Record<string, unknown>[], 'quest_id', 'location_id');
        const factionMap = buildMap(factionRows.rows as Record<string, unknown>[], 'quest_id', 'faction_id');
        const deityMap = buildMap(deityRows.rows as Record<string, unknown>[], 'quest_id', 'deity_id');
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
        return NextResponse.json(filterForRole(data, authResult.user?.role ?? null));
    }, 'Error reading Quests file:', 'Failed to load Quests');
}

export async function POST(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const q = await request.json();
        const res = await db.execute({ sql: `INSERT INTO ${TABLE} (name,notes,status,gm_notes) VALUES (?,?,?,?)`, args: [q.name, JSON.stringify(q.notes ?? []), q.status ?? 'active', q.gm_notes ?? null] });
        const newId = Number(res.lastInsertRowid ?? 0);
        await replaceTagsForQuest(db, newId, q.tagged_npcs ?? [], q.tagged_locations ?? [], q.tagged_factions ?? [], q.tagged_deities ?? []);
        return NextResponse.json({ success: true, data: { ...q, id: String(newId) } });
    }, 'Error creating Quest:', 'Failed to create Quest');
}

export async function PUT(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const q = await request.json();
        const res = await db.execute({ sql: `UPDATE ${TABLE} SET name=?,notes=?,status=?,gm_notes=? WHERE id=?`, args: [q.name, JSON.stringify(q.notes ?? []), q.status ?? 'active', q.gm_notes ?? null, Number(q.id)] });
        if ((res.rowsAffected ?? 0) === 0) return notFound('Quest not found');
        await replaceTagsForQuest(db, q.id, q.tagged_npcs ?? [], q.tagged_locations ?? [], q.tagged_factions ?? [], q.tagged_deities ?? []);
        return NextResponse.json({ success: true, data: q });
    }, 'Error updating Quest:', 'Failed to update Quest');
}

export const PATCH = notesPatchHandler({
    table: TABLE,
    idRequiredMessage: 'Quest ID is required',
    notFoundMessage: 'Quest not found',
    updateFailedMessage: 'Failed to update Quest notes',
    logLabel: 'Error updating Quest notes:',
});

export async function DELETE(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const idResult = requireId(searchParams, 'Quest ID is required');
        if ('error' in idResult) return idResult.error;
        const idNum = Number(idResult.id);
        const results = await db.batch([
            { sql: `DELETE FROM quest_npcs WHERE quest_id=?`, args: [idNum] },
            { sql: `DELETE FROM quest_locations WHERE quest_id=?`, args: [idNum] },
            { sql: `DELETE FROM quest_factions WHERE quest_id=?`, args: [idNum] },
            { sql: `DELETE FROM quest_deities WHERE quest_id=?`, args: [idNum] },
            { sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [idNum] },
        ], "write");
        if ((results[4].rowsAffected ?? 0) === 0) return notFound('Quest not found');
        return NextResponse.json({ success: true });
    }, 'Error deleting Quest:', 'Failed to delete Quest');
}
