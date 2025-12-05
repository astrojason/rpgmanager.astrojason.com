import { NextRequest, NextResponse } from 'next/server';
import { NPC } from '@/types/interfaces';
import { getDb } from '@/lib/turso';
import { ensureSchema } from '@/lib/schema';
import { verifyRequestAuth } from '@/lib/apiAuth';

const TABLE = 'npcs';
const JUNCTION = 'npc_factions';

function rowToNPC(row: Record<string, unknown>, factions: string[]): NPC {
    return {
        id: String(row.id),
        name: row.name !== undefined ? String(row.name) : undefined,
        aka: row.aka !== undefined ? String(row.aka) : undefined,
        display_name: row.display_name !== undefined ? String(row.display_name) : undefined,
        pronunciation: row.pronunciation !== undefined ? String(row.pronunciation) : '',
        race: row.race !== undefined ? String(row.race) : '',
        gender: row.gender !== undefined ? String(row.gender) : '',
        location: row.location !== undefined ? String(row.location) : '',
        status: row.status !== undefined ? String(row.status) : '',
        factions,
        description: row.description !== undefined ? String(row.description) : '',
        background: row.background !== undefined ? String(row.background) : undefined,
        personality: row.personality !== undefined ? String(row.personality) : undefined,
        image: row.image !== undefined ? String(row.image) : undefined,
        hidden: row.hidden ? true : false,
        nameHidden: row.nameHidden ? true : false,
        hide_name: row.hide_name ? true : false,
        notes: row.notes ? JSON.parse(String(row.notes)) : [],
        gm_notes: row.gm_notes !== undefined ? String(row.gm_notes) : undefined,
    };
}

export async function GET(request: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ("errorResponse" in authResult) return authResult.errorResponse;

    try {
        await ensureSchema();
        const db = getDb();
        await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE} (
          id INTEGER PRIMARY KEY,
          name TEXT, aka TEXT, display_name TEXT,
          pronunciation TEXT, race TEXT, gender TEXT,
          location TEXT, status TEXT,
          description TEXT, background TEXT, personality TEXT,
          image TEXT,
          hidden INTEGER, nameHidden INTEGER, hide_name INTEGER,
          notes TEXT, gm_notes TEXT
        )`);
        await db.execute(`CREATE TABLE IF NOT EXISTS ${JUNCTION} (npc_id INTEGER NOT NULL, faction_id INTEGER NOT NULL, PRIMARY KEY(npc_id,faction_id))`);
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
        await ensureSchema();
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
                await tx.execute({ sql: `INSERT OR IGNORE INTO ${JUNCTION} (npc_id,faction_id) VALUES (?,?)`, args: [newId, Number(fid)] });
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
        await ensureSchema();
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
            for (const fid of factions) await tx.execute({ sql: `INSERT OR IGNORE INTO ${JUNCTION} (npc_id,faction_id) VALUES (?,?)`, args: [idNum, Number(fid)] });
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

export async function DELETE(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ("errorResponse" in authResult) return authResult.errorResponse;

    try {
        await ensureSchema();
        const db = getDb();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'NPC ID is required' }, { status: 400 });
        const idNum = Number(id);
        const res = await db.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [idNum] });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'NPC not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting NPC:', error);
        return NextResponse.json({ error: 'Failed to delete NPC' }, { status: 500 });
    }
}
