import { NextRequest, NextResponse } from 'next/server';
import { Item } from '@/types/interfaces';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';
import { notFound, notesPatchHandler, requireId, withErrorHandling } from '@/lib/apiHelpers';

const TABLE = 'items';

function rowToItem(
    row: Record<string, unknown>,
    npcs: string[],
    pcs: string[],
    locations: string[],
    recaps: string[],
): Item {
    return {
        id: String(row.id),
        name: sanitizeText(row.name) ?? '',
        category: sanitizeText(row.category) ?? '',
        pronunciation: sanitizeOptionalText(row.pronunciation),
        type_tag: sanitizeOptionalText(row.type_tag),
        description: sanitizeOptionalText(row.description),
        properties: sanitizeOptionalText(row.properties),
        image: sanitizeOptionalText(row.image),
        hidden: row.hidden ? true : false,
        gm_notes: sanitizeOptionalText(row.gm_notes),
        notes: row.notes ? JSON.parse(String(row.notes)) : [],
        tagged_npcs: npcs,
        tagged_pcs: pcs,
        tagged_locations: locations,
        tagged_recaps: recaps,
    };
}

async function replaceItemTags(
    db: ReturnType<typeof getDb>,
    itemId: number,
    npcs: string[],
    pcs: string[],
    locations: string[],
) {
    await db.batch([
        { sql: `DELETE FROM item_npcs WHERE item_id=?`, args: [itemId] },
        { sql: `DELETE FROM item_pcs WHERE item_id=?`, args: [itemId] },
        { sql: `DELETE FROM item_locations WHERE item_id=?`, args: [itemId] },
        ...npcs.map(id => ({ sql: `INSERT OR IGNORE INTO item_npcs (item_id, npc_id) VALUES (?,?)`, args: [itemId, Number(id)]  as (string | number | null)[] })),
        ...pcs.map(id => ({ sql: `INSERT OR IGNORE INTO item_pcs (item_id, pc_id) VALUES (?,?)`, args: [itemId, Number(id)]  as (string | number | null)[] })),
        ...locations.map(id => ({ sql: `INSERT OR IGNORE INTO item_locations (item_id, location_id) VALUES (?,?)`, args: [itemId, id]  as (string | number | null)[] })),
    ], "write");
}

export async function GET(request?: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const [res, npcRows, pcRows, locRows, recapRows] = await db.batch([
            `SELECT * FROM ${TABLE}`,
            `SELECT item_id, npc_id FROM item_npcs`,
            `SELECT item_id, pc_id FROM item_pcs`,
            `SELECT item_id, location_id FROM item_locations`,
            `SELECT item_id, recap_id FROM recap_items`,
        ], "read");

        const npcMap = new Map<string, string[]>();
        for (const r of npcRows.rows as Record<string, unknown>[]) {
            const k = String(r.item_id);
            if (!npcMap.has(k)) npcMap.set(k, []);
            npcMap.get(k)!.push(String(r.npc_id));
        }
        const pcMap = new Map<string, string[]>();
        for (const r of pcRows.rows as Record<string, unknown>[]) {
            const k = String(r.item_id);
            if (!pcMap.has(k)) pcMap.set(k, []);
            pcMap.get(k)!.push(String(r.pc_id));
        }
        const locMap = new Map<string, string[]>();
        for (const r of locRows.rows as Record<string, unknown>[]) {
            const k = String(r.item_id);
            if (!locMap.has(k)) locMap.set(k, []);
            locMap.get(k)!.push(String(r.location_id));
        }
        const recapMap = new Map<string, string[]>();
        for (const r of recapRows.rows as Record<string, unknown>[]) {
            const k = String(r.item_id);
            if (!recapMap.has(k)) recapMap.set(k, []);
            recapMap.get(k)!.push(String(r.recap_id));
        }
        const items: Item[] = (res.rows as Record<string, unknown>[]).map((row) => {
            const id = String(row.id);
            return rowToItem(
                row,
                npcMap.get(id) ?? [],
                pcMap.get(id) ?? [],
                locMap.get(id) ?? [],
                recapMap.get(id) ?? [],
            );
        });
        return NextResponse.json(items);
    }, 'Error loading items:', 'Failed to load items');
}

export async function POST(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const body: Item = await request.json();
        const tx = await db.transaction('write');
        try {
            const res = await tx.execute({
                sql: `INSERT INTO ${TABLE} (name,category,pronunciation,type_tag,description,properties,image,hidden,gm_notes,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`,
                args: [
                    body.name ?? null,
                    body.category ?? null,
                    body.pronunciation ?? null,
                    body.type_tag ?? null,
                    body.description ?? null,
                    body.properties ?? null,
                    body.image ?? null,
                    body.hidden ? 1 : 0,
                    body.gm_notes ?? null,
                    JSON.stringify(body.notes ?? []),
                ],
            });
            const newId = Number(res.lastInsertRowid ?? 0);
            await tx.commit();
            await replaceItemTags(db, newId, body.tagged_npcs ?? [], body.tagged_pcs ?? [], body.tagged_locations ?? []);
            return NextResponse.json({ success: true, data: { ...body, id: String(newId) } });
        } catch (e) {
            await tx.rollback();
            throw e;
        }
    }, 'Error creating item:', 'Failed to create item');
}

export async function PUT(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const body: Item = await request.json();
        const idNum = Number(body.id);
        const res = await db.execute({
            sql: `UPDATE ${TABLE} SET name=?,category=?,pronunciation=?,type_tag=?,description=?,properties=?,image=?,hidden=?,gm_notes=?,notes=? WHERE id=?`,
            args: [
                body.name ?? null,
                body.category ?? null,
                body.pronunciation ?? null,
                body.type_tag ?? null,
                body.description ?? null,
                body.properties ?? null,
                body.image ?? null,
                body.hidden ? 1 : 0,
                body.gm_notes ?? null,
                JSON.stringify(body.notes ?? []),
                idNum,
            ],
        });
        if ((res.rowsAffected ?? 0) === 0) {
            return notFound('Item not found');
        }
        await replaceItemTags(db, idNum, body.tagged_npcs ?? [], body.tagged_pcs ?? [], body.tagged_locations ?? []);
        return NextResponse.json({ success: true, data: body });
    }, 'Error updating item:', 'Failed to update item');
}

export const PATCH = notesPatchHandler({
    table: TABLE,
    idRequiredMessage: 'Item ID is required',
    notFoundMessage: 'Item not found',
    updateFailedMessage: 'Failed to update item notes',
    logLabel: 'Error updating item notes:',
});

export async function DELETE(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const idResult = requireId(searchParams, 'Item ID is required');
        if ('error' in idResult) return idResult.error;
        const idNum = Number(idResult.id);
        const results = await db.batch([
            { sql: `DELETE FROM item_npcs WHERE item_id=?`, args: [idNum] },
            { sql: `DELETE FROM item_pcs WHERE item_id=?`, args: [idNum] },
            { sql: `DELETE FROM item_locations WHERE item_id=?`, args: [idNum] },
            { sql: `DELETE FROM recap_items WHERE item_id=?`, args: [idNum] },
            { sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [idNum] },
        ], "write");
        if ((results[4].rowsAffected ?? 0) === 0) {
            return notFound('Item not found');
        }
        return NextResponse.json({ success: true });
    }, 'Error deleting item:', 'Failed to delete item');
}
