import { NextRequest, NextResponse } from 'next/server';
import { NPC } from '@/types/interfaces';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';

const TABLE = 'npcs';
const JUNCTION = 'npc_factions';

function rowToNPC(row: Record<string, unknown>, factions: string[]): NPC {
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
        personality: sanitizeOptionalText(row.personality),
        image: sanitizeOptionalText(row.image),
        hidden: row.hidden ? true : false,
        nameHidden: row.nameHidden ? true : false,
        hide_name: row.hide_name ? true : false,
        notes: row.notes ? JSON.parse(String(row.notes)) : [],
        gm_notes: sanitizeOptionalText(row.gm_notes),
    };
}

export async function GET(request?: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    try {
        const db = getDb();
        const base = await db.execute(`SELECT * FROM ${TABLE}`);
        const jf = await db.execute(`SELECT npc_id, faction_id FROM ${JUNCTION}`);
        const map = new Map<number, string[]>();
        for (const r of jf.rows as unknown[]) {
            const row = r as Record<string, unknown>;
            const nid = Number(row.npc_id);
            const fid = String(row.faction_id);
            if (!map.has(nid)) map.set(nid, []);
            map.get(nid)!.push(fid);
        }
        const out: NPC[] = [];
        for (const row of base.rows as unknown[]) out.push(rowToNPC(row as Record<string, unknown>, map.get(Number((row as Record<string, unknown>).id)) ?? []));
        return NextResponse.json(out);
    } catch (error) {
        console.error('Error loading NPCs:', error);
        return NextResponse.json({ error: 'Failed to load NPCs' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ("errorResponse" in authResult) return authResult.errorResponse;

    try {
        const db = getDb();
        const body: NPC = await request.json();
        const factions = Array.isArray(body.factions) ? body.factions : [];
        const tx = await db.transaction('write');
        try {
            const res = await tx.execute({
                sql: `INSERT INTO ${TABLE} (name,aka,display_name,pronunciation,race,gender,location,status,description,background,personality,image,hidden,nameHidden,hide_name,notes,gm_notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
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
                    body.personality ?? null,
                    body.image ?? null,
                    body.hidden ? 1 : 0,
                    body.nameHidden ? 1 : 0,
                    body.hide_name ? 1 : 0,
                    JSON.stringify(body.notes ?? []),
                    body.gm_notes ?? null,
                ],
            });
            const newId = Number(res.lastInsertRowid ?? 0);
            for (const fid of factions) {
                // faction_id is TEXT in database, keep as string
                await tx.execute({ sql: `INSERT OR IGNORE INTO ${JUNCTION} (npc_id,faction_id) VALUES (?,?)`, args: [newId, fid] });
            }
            await tx.commit();
            return NextResponse.json({ success: true, data: { ...body, id: String(newId) } });
        } catch (e) {
            await tx.rollback();
            throw e;
        }
    } catch (error) {
        console.error('Error creating NPC:', error);
        return NextResponse.json({ error: 'Failed to create NPC' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ("errorResponse" in authResult) return authResult.errorResponse;

    try {
        const db = getDb();
        const body: NPC = await request.json();
        const idNum = Number(body.id);
        const factions = Array.isArray(body.factions) ? body.factions : [];
        const tx = await db.transaction('write');
        try {
            const res = await tx.execute({
                sql: `UPDATE ${TABLE} SET name=?,aka=?,display_name=?,pronunciation=?,race=?,gender=?,location=?,status=?,description=?,background=?,personality=?,image=?,hidden=?,nameHidden=?,hide_name=?,notes=?,gm_notes=? WHERE id=?`,
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
                    body.personality ?? null,
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
                return NextResponse.json({ error: 'NPC not found' }, { status: 404 });
            }
            await tx.execute({ sql: `DELETE FROM ${JUNCTION} WHERE npc_id=?`, args: [idNum] });
            // faction_id is TEXT in database, keep as string
            for (const fid of factions) await tx.execute({ sql: `INSERT OR IGNORE INTO ${JUNCTION} (npc_id,faction_id) VALUES (?,?)`, args: [idNum, fid] });
            await tx.commit();
            return NextResponse.json({ success: true, data: body });
        } catch (e) {
            await tx.rollback();
            throw e;
        }
    } catch (error) {
        console.error('Error updating NPC:', error);
        return NextResponse.json({ error: 'Failed to update NPC' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    try {
        const db = getDb();
        const body: { id?: string; notes?: unknown[] } = await request.json();
        if (!body.id) return NextResponse.json({ error: 'NPC ID is required' }, { status: 400 });

        const res = await db.execute({
            sql: `UPDATE ${TABLE} SET notes=? WHERE id=?`,
            args: [JSON.stringify(body.notes ?? []), Number(body.id)],
        });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'NPC not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating NPC notes:', error);
        return NextResponse.json({ error: 'Failed to update NPC notes' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ("errorResponse" in authResult) return authResult.errorResponse;

    try {
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'NPC ID is required' }, { status: 400 });
        const idNum = Number(id);

        // Use transaction to ensure junction table records are deleted atomically
        const tx = await db.transaction('write');
        try {
            // Delete junction table entries first
            await tx.execute({ sql: `DELETE FROM ${JUNCTION} WHERE npc_id=?`, args: [idNum] });

            // Then delete the NPC
            const res = await tx.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [idNum] });

            if ((res.rowsAffected ?? 0) === 0) {
                await tx.rollback();
                return NextResponse.json({ error: 'NPC not found' }, { status: 404 });
            }

            await tx.commit();
            return NextResponse.json({ success: true });
        } catch (e) {
            await tx.rollback();
            throw e;
        }
    } catch (error) {
        console.error('Error deleting NPC:', error);
        return NextResponse.json({ error: 'Failed to delete NPC' }, { status: 500 });
    }
}
