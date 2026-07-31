import { NextRequest, NextResponse } from 'next/server';
import { NPC } from '@/types/interfaces';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';
import { notFound, notesPatchHandler, requireId, withErrorHandling } from '@/lib/apiHelpers';

const TABLE = 'npcs';
const JUNCTION = 'npc_factions';
const LINKED = 'npc_linked_npcs';

function rowToNPC(row: Record<string, unknown>, factions: string[], linked_npcs: string[]): NPC {
    return {
        id: String(row.id),
        name: sanitizeOptionalText(row.name),
        aka: sanitizeOptionalText(row.aka),
        display_name: sanitizeOptionalText(row.display_name),
        pronunciation: sanitizeText(row.pronunciation),
        race: sanitizeText(row.race),
        gender: sanitizeText(row.gender),
        location: sanitizeText(row.location),
        status: sanitizeText(row.status),
        factions,
        description: sanitizeText(row.description),
        background: sanitizeOptionalText(row.background),
        roleplaying_notes: sanitizeOptionalText(row.roleplaying_notes),
        image: sanitizeOptionalText(row.image),
        hidden: row.hidden ? true : false,
        nameHidden: row.nameHidden ? true : false,
        hide_name: row.hide_name ? true : false,
        notes: row.notes ? JSON.parse(String(row.notes)) : [],
        gm_notes: sanitizeOptionalText(row.gm_notes),
        linked_npcs,
    };
}

export async function GET(request?: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const [base, jf, jl] = await db.batch([
            `SELECT * FROM ${TABLE}`,
            `SELECT npc_id, faction_id FROM ${JUNCTION}`,
            `SELECT npc_id, linked_npc_id FROM ${LINKED}`,
        ], "read");
        const map = new Map<number, string[]>();
        for (const r of jf.rows as unknown[]) {
            const row = r as Record<string, unknown>;
            const nid = Number(row.npc_id);
            const fid = String(row.faction_id);
            if (!map.has(nid)) map.set(nid, []);
            map.get(nid)!.push(fid);
        }
        const linkedMap = new Map<number, string[]>();
        for (const r of jl.rows as unknown[]) {
            const row = r as Record<string, unknown>;
            const nid = Number(row.npc_id);
            const lid = Number(row.linked_npc_id);
            if (!linkedMap.has(nid)) linkedMap.set(nid, []);
            if (!linkedMap.get(nid)!.includes(String(lid))) linkedMap.get(nid)!.push(String(lid));
            if (!linkedMap.has(lid)) linkedMap.set(lid, []);
            if (!linkedMap.get(lid)!.includes(String(nid))) linkedMap.get(lid)!.push(String(nid));
        }
        const out: NPC[] = [];
        for (const row of base.rows as unknown[]) out.push(rowToNPC(row as Record<string, unknown>, map.get(Number((row as Record<string, unknown>).id)) ?? [], linkedMap.get(Number((row as Record<string, unknown>).id)) ?? []));
        return NextResponse.json(out);
    }, 'Error loading NPCs:', 'Failed to load NPCs');
}

export async function POST(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ("errorResponse" in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const body: NPC = await request.json();
        const factions = Array.isArray(body.factions) ? body.factions : [];
        const tx = await db.transaction('write');
        try {
            const res = await tx.execute({
                sql: `INSERT INTO ${TABLE} (name,aka,display_name,pronunciation,race,gender,location,status,description,background,roleplaying_notes,image,hidden,nameHidden,hide_name,notes,gm_notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
                args: [
                    body.name ?? null,
                    (Array.isArray(body.aka) ? (body.aka as unknown as string[])?.join(', ') : body.aka) ?? null,
                    body.display_name ?? null,
                    body.pronunciation ?? null,
                    body.race ?? null,
                    body.gender ?? null,
                    body.location ?? null,
                    body.status ?? null,
                    body.description ?? null,
                    body.background ?? null,
                    body.roleplaying_notes ?? null,
                    body.image ?? null,
                    body.hidden ? 1 : 0,
                    body.nameHidden ? 1 : 0,
                    body.hide_name ? 1 : 0,
                    JSON.stringify(body.notes ?? []),
                    body.gm_notes ?? null,
                ],
            });
            const newId = Number(res.lastInsertRowid ?? 0);
            if (factions.length > 0) {
                const placeholders = factions.map(() => '(?,?)').join(',');
                await tx.execute({ sql: `INSERT OR IGNORE INTO ${JUNCTION} (npc_id,faction_id) VALUES ${placeholders}`, args: factions.flatMap(fid => [newId, fid]) });
            }
            const linkedNpcs = Array.isArray(body.linked_npcs) ? body.linked_npcs : [];
            if (linkedNpcs.length > 0) {
                const placeholders = linkedNpcs.map(() => '(?,?)').join(',');
                await tx.execute({ sql: `INSERT OR IGNORE INTO ${LINKED} (npc_id,linked_npc_id) VALUES ${placeholders}`, args: linkedNpcs.flatMap(lid => [newId, lid]) });
            }
            await tx.commit();
            return NextResponse.json({ success: true, data: { ...body, id: String(newId) } });
        } catch (e) {
            await tx.rollback();
            throw e;
        }
    }, 'Error creating NPC:', 'Failed to create NPC');
}

export async function PUT(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ("errorResponse" in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const body: NPC = await request.json();
        const idNum = Number(body.id);
        const factions = Array.isArray(body.factions) ? body.factions : [];
        const tx = await db.transaction('write');
        try {
            const res = await tx.execute({
                sql: `UPDATE ${TABLE} SET name=?,aka=?,display_name=?,pronunciation=?,race=?,gender=?,location=?,status=?,description=?,background=?,roleplaying_notes=?,image=?,hidden=?,nameHidden=?,hide_name=?,notes=?,gm_notes=? WHERE id=?`,
                args: [
                    body.name ?? null,
                    (Array.isArray(body.aka) ? (body.aka as unknown as string[])?.join(', ') : body.aka) ?? null,
                    body.display_name ?? null,
                    body.pronunciation ?? null,
                    body.race ?? null,
                    body.gender ?? null,
                    body.location ?? null,
                    body.status ?? null,
                    body.description ?? null,
                    body.background ?? null,
                    body.roleplaying_notes ?? null,
                    body.image ?? null,
                    body.hidden ? 1 : 0,
                    body.nameHidden ? 1 : 0,
                    body.hide_name ? 1 : 0,
                    JSON.stringify(body.notes ?? []),
                    body.gm_notes ?? null,
                    idNum,
                ],
            });
            if ((res.rowsAffected ?? 0) === 0) {
                await tx.rollback();
                return notFound('NPC not found');
            }
            await tx.execute({ sql: `DELETE FROM ${JUNCTION} WHERE npc_id=?`, args: [idNum] });
            if (factions.length > 0) {
                const placeholders = factions.map(() => '(?,?)').join(',');
                await tx.execute({ sql: `INSERT OR IGNORE INTO ${JUNCTION} (npc_id,faction_id) VALUES ${placeholders}`, args: factions.flatMap(fid => [idNum, fid]) });
            }
            const linkedNpcs = Array.isArray(body.linked_npcs) ? body.linked_npcs : [];
            await tx.execute({ sql: `DELETE FROM ${LINKED} WHERE npc_id=?`, args: [idNum] });
            if (linkedNpcs.length > 0) {
                const placeholders = linkedNpcs.map(() => '(?,?)').join(',');
                await tx.execute({ sql: `INSERT OR IGNORE INTO ${LINKED} (npc_id,linked_npc_id) VALUES ${placeholders}`, args: linkedNpcs.flatMap(lid => [idNum, lid]) });
            }
            await tx.commit();
            return NextResponse.json({ success: true, data: body });
        } catch (e) {
            await tx.rollback();
            throw e;
        }
    }, 'Error updating NPC:', 'Failed to update NPC');
}

export const PATCH = notesPatchHandler({
    table: TABLE,
    idRequiredMessage: 'NPC ID is required',
    notFoundMessage: 'NPC not found',
    updateFailedMessage: 'Failed to update NPC notes',
    logLabel: 'Error updating NPC notes:',
});

export async function DELETE(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ("errorResponse" in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const idResult = requireId(searchParams, 'NPC ID is required');
        if ('error' in idResult) return idResult.error;
        const idNum = Number(idResult.id);

        // Use transaction to ensure junction table records are deleted atomically
        const tx = await db.transaction('write');
        try {
            await tx.execute({ sql: `DELETE FROM ${JUNCTION} WHERE npc_id=?`, args: [idNum] });
            await tx.execute({ sql: `DELETE FROM ${LINKED} WHERE npc_id=? OR linked_npc_id=?`, args: [idNum, idNum] });
            const res = await tx.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [idNum] });

            if ((res.rowsAffected ?? 0) === 0) {
                await tx.rollback();
                return notFound('NPC not found');
            }

            await tx.commit();
            return NextResponse.json({ success: true });
        } catch (e) {
            await tx.rollback();
            throw e;
        }
    }, 'Error deleting NPC:', 'Failed to delete NPC');
}
