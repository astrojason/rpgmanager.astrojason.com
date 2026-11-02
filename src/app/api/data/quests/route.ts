import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';
import { filterForRole, isPrivilegedRole, notFound, notesPatchHandler, requireId, withErrorHandling } from '@/lib/apiHelpers';

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

type ParentResult = { error: NextResponse } | { parentId: number | null; parentHidden: 0 | 1 };

/** Normalises the parent link from a request body and rejects self-parenting, missing parents and cycles. */
async function resolveParent(
    db: ReturnType<typeof getDb>,
    body: { parent_id?: unknown; parent_hidden?: unknown },
    questId: number | null
): Promise<ParentResult> {
    const raw = body.parent_id;
    if (raw === null || raw === undefined || raw === '') return { parentId: null, parentHidden: 0 };
    const parentId = Number(raw);
    if (!Number.isInteger(parentId)) return { error: NextResponse.json({ error: 'Invalid parent quest' }, { status: 400 }) };
    if (questId !== null && parentId === questId) {
        return { error: NextResponse.json({ error: 'A quest cannot be its own parent' }, { status: 400 }) };
    }
    // Walk up from the chosen parent: it must exist, and must not lead back to this quest.
    const seen = new Set<number>();
    let current: number | null = parentId;
    while (current !== null) {
        if (seen.has(current)) break;
        seen.add(current);
        const res = await db.execute({ sql: `SELECT parent_id FROM ${TABLE} WHERE id=?`, args: [current] });
        if (res.rows.length === 0) {
            return { error: NextResponse.json({ error: 'Parent quest not found' }, { status: 400 }) };
        }
        const next: unknown = res.rows[0].parent_id;
        current = next === null || next === undefined ? null : Number(next);
        if (questId !== null && current === questId) {
            return { error: NextResponse.json({ error: 'The chosen parent is a descendant of this quest; that would create a cycle' }, { status: 400 }) };
        }
    }
    return { parentId, parentHidden: body.parent_hidden ? 1 : 0 };
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
                parent_id: r.parent_id === null || r.parent_id === undefined ? null : String(r.parent_id),
                parent_hidden: !!r.parent_hidden,
                gm_notes: sanitizeOptionalText(r.gm_notes),
                tagged_npcs: npcMap.get(id) ?? [],
                tagged_locations: locMap.get(id) ?? [],
                tagged_factions: factionMap.get(id) ?? [],
                tagged_deities: deityMap.get(id) ?? [],
            };
        });
        const role = authResult.user?.role ?? null;
        // Status alone decides visibility: players never see undiscovered quests.
        if (isPrivilegedRole(role)) return NextResponse.json(data);
        const visible = data.filter(q => q.status !== 'undiscovered');
        const visibleIds = new Set(visible.map(q => q.id));
        // Players only see a parent link that is not hidden and points at a quest they can see.
        const shaped = visible.map(({ parent_hidden, ...q }) => ({
            ...q,
            parent_id: q.parent_id && !parent_hidden && visibleIds.has(q.parent_id) ? q.parent_id : null,
        }));
        return NextResponse.json(filterForRole(shaped, role));
    }, 'Error reading Quests file:', 'Failed to load Quests');
}

export async function POST(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const q = await request.json();
        const parent = await resolveParent(db, q, null);
        if ('error' in parent) return parent.error;
        const res = await db.execute({ sql: `INSERT INTO ${TABLE} (name,notes,status,gm_notes,parent_id,parent_hidden) VALUES (?,?,?,?,?,?)`, args: [q.name, JSON.stringify(q.notes ?? []), q.status ?? 'active', q.gm_notes ?? null, parent.parentId, parent.parentHidden] });
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
        const parent = await resolveParent(db, q, Number(q.id));
        if ('error' in parent) return parent.error;
        const res = await db.execute({ sql: `UPDATE ${TABLE} SET name=?,notes=?,status=?,gm_notes=?,parent_id=?,parent_hidden=? WHERE id=?`, args: [q.name, JSON.stringify(q.notes ?? []), q.status ?? 'active', q.gm_notes ?? null, parent.parentId, parent.parentHidden, Number(q.id)] });
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
