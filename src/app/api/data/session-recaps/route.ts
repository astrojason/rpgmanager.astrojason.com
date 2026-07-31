import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { SessionRecap } from '@/types/interfaces';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { genUUID } from '@/lib/id';
import { notFound, notesPatchHandler, requireId, withErrorHandling } from '@/lib/apiHelpers';

async function replaceTagsForRecap(
    db: ReturnType<typeof getDb>,
    recapId: string | number,
    npcs: string[], locations: string[], quests: string[], items: string[],
    factions: string[] = [], deities: string[] = []
) {
    const id = Number(recapId);
    await db.batch([
        { sql: `DELETE FROM recap_npcs WHERE recap_id=?`, args: [id] },
        { sql: `DELETE FROM recap_locations WHERE recap_id=?`, args: [id] },
        { sql: `DELETE FROM recap_quests WHERE recap_id=?`, args: [id] },
        { sql: `DELETE FROM recap_items WHERE recap_id=?`, args: [id] },
        { sql: `DELETE FROM recap_factions WHERE recap_id=?`, args: [id] },
        { sql: `DELETE FROM recap_deities WHERE recap_id=?`, args: [id] },
        ...npcs.map(npcId => ({ sql: `INSERT OR IGNORE INTO recap_npcs (recap_id, npc_id) VALUES (?,?)`, args: [id, Number(npcId)]  as (string | number | null)[] })),
        ...locations.map(locId => ({ sql: `INSERT OR IGNORE INTO recap_locations (recap_id, location_id) VALUES (?,?)`, args: [id, locId]  as (string | number | null)[] })),
        ...quests.map(questId => ({ sql: `INSERT OR IGNORE INTO recap_quests (recap_id, quest_id) VALUES (?,?)`, args: [id, Number(questId)]  as (string | number | null)[] })),
        ...items.map(itemId => ({ sql: `INSERT OR IGNORE INTO recap_items (recap_id, item_id) VALUES (?,?)`, args: [id, Number(itemId)]  as (string | number | null)[] })),
        ...factions.map(factionId => ({ sql: `INSERT OR IGNORE INTO recap_factions (recap_id, faction_id) VALUES (?,?)`, args: [id, factionId]  as (string | number | null)[] })),
        ...deities.map(deityId => ({ sql: `INSERT OR IGNORE INTO recap_deities (recap_id, deity_id) VALUES (?,?)`, args: [id, Number(deityId)]  as (string | number | null)[] })),
    ], "write");
}

const TABLE = 'session_recaps';

export async function GET(request?: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const [res, npcRows, locRows, questRows, itemRows, factionRows, deityRows] = await db.batch([
            `SELECT * FROM ${TABLE}`,
            `SELECT recap_id, npc_id FROM recap_npcs`,
            `SELECT recap_id, location_id FROM recap_locations`,
            `SELECT recap_id, quest_id FROM recap_quests`,
            `SELECT recap_id, item_id FROM recap_items`,
            `SELECT recap_id, faction_id FROM recap_factions`,
            `SELECT recap_id, deity_id FROM recap_deities`,
        ], "read");

        function buildMap(rows: Record<string, unknown>[], keyCol: string, valCol: string): Map<string, string[]> {
            const m = new Map<string, string[]>();
            for (const r of rows) {
                const key = String(r[keyCol]);
                if (!m.has(key)) m.set(key, []);
                m.get(key)!.push(String(r[valCol]));
            }
            return m;
        }

        const npcMap = buildMap(npcRows.rows as Record<string, unknown>[], 'recap_id', 'npc_id');
        const locMap = buildMap(locRows.rows as Record<string, unknown>[], 'recap_id', 'location_id');
        const questMap = buildMap(questRows.rows as Record<string, unknown>[], 'recap_id', 'quest_id');
        const itemMap = buildMap(itemRows.rows as Record<string, unknown>[], 'recap_id', 'item_id');
        const factionMap = buildMap(factionRows.rows as Record<string, unknown>[], 'recap_id', 'faction_id');
        const deityMap = buildMap(deityRows.rows as Record<string, unknown>[], 'recap_id', 'deity_id');

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
    }, 'Error reading Session Recaps file:', 'Failed to load Session Recaps');
}

export async function POST(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const newRecap: SessionRecap = await request.json();
        if (!Array.isArray(newRecap.notes)) newRecap.notes = [];
        const res = await db.execute({ sql: `INSERT INTO ${TABLE} (date,title,recap,author,notes) VALUES (?,?,?,?,?)`, args: [newRecap.date, newRecap.title, newRecap.recap, newRecap.author ?? null, JSON.stringify(newRecap.notes ?? [])] });
        const newId = Number(res.lastInsertRowid ?? 0);
        await replaceTagsForRecap(db, newId, newRecap.tagged_npcs ?? [], newRecap.tagged_locations ?? [], newRecap.tagged_quests ?? [], newRecap.tagged_items ?? [], newRecap.tagged_factions ?? [], newRecap.tagged_deities ?? []);
        return NextResponse.json({ success: true, data: { ...newRecap, id: String(newId) } });
    }, 'Error creating Session Recap:', 'Failed to create Session Recap');
}

export async function PUT(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const updatedRecap: SessionRecap = await request.json();
        const res = await db.execute({ sql: `UPDATE ${TABLE} SET date=?,title=?,recap=?,author=?,notes=? WHERE id=?`, args: [updatedRecap.date, updatedRecap.title, updatedRecap.recap, updatedRecap.author || null, JSON.stringify(updatedRecap.notes ?? []), Number(updatedRecap.id)] });
        if ((res.rowsAffected ?? 0) === 0) return notFound('Session Recap not found');
        await replaceTagsForRecap(db, updatedRecap.id!, updatedRecap.tagged_npcs ?? [], updatedRecap.tagged_locations ?? [], updatedRecap.tagged_quests ?? [], updatedRecap.tagged_items ?? [], updatedRecap.tagged_factions ?? [], updatedRecap.tagged_deities ?? []);
        return NextResponse.json({ success: true, data: updatedRecap });
    }, 'Error updating Session Recap:', 'Failed to update Session Recap');
}

export const PATCH = notesPatchHandler({
    table: TABLE,
    idRequiredMessage: 'Recap ID is required',
    notFoundMessage: 'Recap not found',
    updateFailedMessage: 'Failed to update recap notes',
    logLabel: 'Error updating recap notes:',
});

export async function DELETE(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const idResult = requireId(searchParams, 'ID is required');
        if ('error' in idResult) return idResult.error;
        const idNum = Number(idResult.id);
        const results = await db.batch([
            { sql: `DELETE FROM recap_npcs WHERE recap_id=?`, args: [idNum] },
            { sql: `DELETE FROM recap_locations WHERE recap_id=?`, args: [idNum] },
            { sql: `DELETE FROM recap_quests WHERE recap_id=?`, args: [idNum] },
            { sql: `DELETE FROM recap_items WHERE recap_id=?`, args: [idNum] },
            { sql: `DELETE FROM recap_factions WHERE recap_id=?`, args: [idNum] },
            { sql: `DELETE FROM recap_deities WHERE recap_id=?`, args: [idNum] },
            { sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [idNum] },
        ], "write");
        if ((results[6].rowsAffected ?? 0) === 0) return notFound('Session Recap not found');
        return NextResponse.json({ success: true });
    }, 'Error deleting Session Recap:', 'Failed to delete Session Recap');
}
