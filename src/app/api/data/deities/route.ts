import { NextRequest, NextResponse } from 'next/server';
import { Deity } from '@/types/interfaces';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { safeImageSrc, sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';
import { filterForRole, notFound, notesPatchHandler, requireId, withErrorHandling } from '@/lib/apiHelpers';

const TABLE = 'deities';

async function replaceFollowers(db: ReturnType<typeof getDb>, deityId: number, npcs: string[], pcs: string[]) {
    await db.batch([
        { sql: `DELETE FROM deity_follower_npcs WHERE deity_id=?`, args: [deityId] },
        { sql: `DELETE FROM deity_follower_pcs WHERE deity_id=?`, args: [deityId] },
        ...npcs.map(id => ({ sql: `INSERT OR IGNORE INTO deity_follower_npcs (deity_id, npc_id) VALUES (?,?)`, args: [deityId, Number(id)]  as (string | number | null)[] })),
        ...pcs.map(id => ({ sql: `INSERT OR IGNORE INTO deity_follower_pcs (deity_id, pc_id) VALUES (?,?)`, args: [deityId, Number(id)]  as (string | number | null)[] })),
    ], "write");
}

export async function GET(request?: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const [res, recapRows, questRows, npcRows, pcRows] = await db.batch([
            `SELECT * FROM ${TABLE}`,
            `SELECT deity_id, recap_id FROM recap_deities`,
            `SELECT deity_id, quest_id FROM quest_deities`,
            `SELECT deity_id, npc_id FROM deity_follower_npcs`,
            `SELECT deity_id, pc_id FROM deity_follower_pcs`,
        ], "read");

        const build = <T extends Record<string, unknown>>(rows: T[], keyField: string, valField: string) => {
            const map = new Map<string, string[]>();
            for (const r of rows) {
                const k = String(r[keyField]);
                if (!map.has(k)) map.set(k, []);
                map.get(k)!.push(String(r[valField]));
            }
            return map;
        };

        const recapMap = build(recapRows.rows as Record<string, unknown>[], 'deity_id', 'recap_id');
        const questMap = build(questRows.rows as Record<string, unknown>[], 'deity_id', 'quest_id');
        const npcMap = build(npcRows.rows as Record<string, unknown>[], 'deity_id', 'npc_id');
        const pcMap = build(pcRows.rows as Record<string, unknown>[], 'deity_id', 'pc_id');

        const data: Deity[] = res.rows.map((r: Record<string, unknown>) => {
            const id = String(r.id);
            return {
                id,
                name: sanitizeText(r.name),
                pronunciation: sanitizeOptionalText(r.pronunciation),
                domain: sanitizeOptionalText(r.domain),
                alignment: sanitizeOptionalText(r.alignment),
                status: sanitizeOptionalText(r.status),
                description: sanitizeOptionalText(r.description),
                image: safeImageSrc(r.image),
                hidden: !!r.hidden,
                gm_notes: sanitizeOptionalText(r.gm_notes),
                notes: r.notes ? JSON.parse(String(r.notes)) : [],
                tagged_recaps: recapMap.get(id) ?? [],
                tagged_quests: questMap.get(id) ?? [],
                symbol: sanitizeOptionalText(r.symbol),
                church: sanitizeOptionalText(r.church),
                garments: sanitizeOptionalText(r.garments),
                tenets: sanitizeOptionalText(r.tenets),
                lore: sanitizeOptionalText(r.lore),
                follower_npcs: npcMap.get(id) ?? [],
                follower_pcs: pcMap.get(id) ?? [],
            };
        });
        return NextResponse.json(filterForRole(data, authResult.user?.role ?? null));
    }, 'Error reading Deities:', 'Failed to load Deities');
}

export async function POST(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const d: Deity = await request.json();
        const res = await db.execute({
            sql: `INSERT INTO ${TABLE} (name,pronunciation,domain,alignment,status,description,image,hidden,gm_notes,notes,symbol,church,garments,tenets,lore) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            args: [d.name, d.pronunciation ?? null, d.domain ?? null, d.alignment ?? null, d.status ?? null, d.description ?? null, d.image ?? null, d.hidden ? 1 : 0, d.gm_notes ?? null, JSON.stringify(d.notes ?? []), d.symbol ?? null, d.church ?? null, d.garments ?? null, d.tenets ?? null, d.lore ?? null],
        });
        const newId = Number(res.lastInsertRowid ?? 0);
        await replaceFollowers(db, newId, d.follower_npcs ?? [], d.follower_pcs ?? []);
        return NextResponse.json({ success: true, data: { ...d, id: String(newId) } });
    }, 'Error creating Deity:', 'Failed to create Deity');
}

export async function PUT(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const d: Deity = await request.json();
        const idNum = Number(d.id);
        const res = await db.execute({
            sql: `UPDATE ${TABLE} SET name=?,pronunciation=?,domain=?,alignment=?,status=?,description=?,image=?,hidden=?,gm_notes=?,notes=?,symbol=?,church=?,garments=?,tenets=?,lore=? WHERE id=?`,
            args: [d.name, d.pronunciation ?? null, d.domain ?? null, d.alignment ?? null, d.status ?? null, d.description ?? null, d.image ?? null, d.hidden ? 1 : 0, d.gm_notes ?? null, JSON.stringify(d.notes ?? []), d.symbol ?? null, d.church ?? null, d.garments ?? null, d.tenets ?? null, d.lore ?? null, idNum],
        });
        if ((res.rowsAffected ?? 0) === 0) return notFound('Deity not found');
        await replaceFollowers(db, idNum, d.follower_npcs ?? [], d.follower_pcs ?? []);
        return NextResponse.json({ success: true, data: d });
    }, 'Error updating Deity:', 'Failed to update Deity');
}

export const PATCH = notesPatchHandler({
    table: TABLE,
    idRequiredMessage: 'Deity ID is required',
    notFoundMessage: 'Deity not found',
    updateFailedMessage: 'Failed to update deity notes',
    logLabel: 'Error updating deity notes:',
});

export async function DELETE(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const idResult = requireId(searchParams, 'Deity ID is required');
        if ('error' in idResult) return idResult.error;
        const idNum = Number(idResult.id);
        const results = await db.batch([
            { sql: `DELETE FROM recap_deities WHERE deity_id=?`, args: [idNum] },
            { sql: `DELETE FROM quest_deities WHERE deity_id=?`, args: [idNum] },
            { sql: `DELETE FROM deity_follower_npcs WHERE deity_id=?`, args: [idNum] },
            { sql: `DELETE FROM deity_follower_pcs WHERE deity_id=?`, args: [idNum] },
            { sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [idNum] },
        ], "write");
        if ((results[4].rowsAffected ?? 0) === 0) return notFound('Deity not found');
        return NextResponse.json({ success: true });
    }, 'Error deleting Deity:', 'Failed to delete Deity');
}
