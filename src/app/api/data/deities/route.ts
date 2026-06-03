import { NextRequest, NextResponse } from 'next/server';
import { Deity } from '@/types/interfaces';
import { getDb } from '@/lib/turso';
import { ensureSchema } from '@/lib/schema';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { safeImageSrc, sanitizeOptionalText, sanitizeText } from '@/utils/sanitize';

const TABLE = 'deities';

async function loadDeityTagMaps(db: ReturnType<typeof getDb>) {
    const recapRows = await db.execute(`SELECT deity_id, recap_id FROM recap_deities`);
    const questRows = await db.execute(`SELECT deity_id, quest_id FROM quest_deities`);
    const recapMap = new Map<string, string[]>();
    for (const r of recapRows.rows as Record<string, unknown>[]) {
        const key = String(r.deity_id);
        if (!recapMap.has(key)) recapMap.set(key, []);
        recapMap.get(key)!.push(String(r.recap_id));
    }
    const questMap = new Map<string, string[]>();
    for (const r of questRows.rows as Record<string, unknown>[]) {
        const key = String(r.deity_id);
        if (!questMap.has(key)) questMap.set(key, []);
        questMap.get(key)!.push(String(r.quest_id));
    }
    return { recapMap, questMap };
}

export async function GET(request?: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        await ensureSchema();
        const db = getDb();
        const res = await db.execute(`SELECT * FROM ${TABLE}`);
        const { recapMap, questMap } = await loadDeityTagMaps(db);
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
                notable_followers: sanitizeOptionalText(r.notable_followers),
            };
        });
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error reading Deities:', error);
        return NextResponse.json({ error: 'Failed to load Deities' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        await ensureSchema();
        const db = getDb();
        const d: Deity = await request.json();
        const res = await db.execute({
            sql: `INSERT INTO ${TABLE} (name,pronunciation,domain,alignment,status,description,image,hidden,gm_notes,notes,symbol,church,garments,tenets,lore,notable_followers) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            args: [d.name, d.pronunciation ?? null, d.domain ?? null, d.alignment ?? null, d.status ?? null, d.description ?? null, d.image ?? null, d.hidden ? 1 : 0, d.gm_notes ?? null, JSON.stringify(d.notes ?? []), d.symbol ?? null, d.church ?? null, d.garments ?? null, d.tenets ?? null, d.lore ?? null, d.notable_followers ?? null],
        });
        return NextResponse.json({ success: true, data: { ...d, id: String(res.lastInsertRowid ?? 0) } });
    } catch (error) {
        console.error('Error creating Deity:', error);
        return NextResponse.json({ error: 'Failed to create Deity' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
    if ('errorResponse' in authResult) return authResult.errorResponse;

    try {
        await ensureSchema();
        const db = getDb();
        const d: Deity = await request.json();
        const res = await db.execute({
            sql: `UPDATE ${TABLE} SET name=?,pronunciation=?,domain=?,alignment=?,status=?,description=?,image=?,hidden=?,gm_notes=?,notes=?,symbol=?,church=?,garments=?,tenets=?,lore=?,notable_followers=? WHERE id=?`,
            args: [d.name, d.pronunciation ?? null, d.domain ?? null, d.alignment ?? null, d.status ?? null, d.description ?? null, d.image ?? null, d.hidden ? 1 : 0, d.gm_notes ?? null, JSON.stringify(d.notes ?? []), d.symbol ?? null, d.church ?? null, d.garments ?? null, d.tenets ?? null, d.lore ?? null, d.notable_followers ?? null, Number(d.id)],
        });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Deity not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: d });
    } catch (error) {
        console.error('Error updating Deity:', error);
        return NextResponse.json({ error: 'Failed to update Deity' }, { status: 500 });
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
        if (!id) return NextResponse.json({ error: 'Deity ID is required' }, { status: 400 });
        await db.execute({ sql: `DELETE FROM recap_deities WHERE deity_id=?`, args: [Number(id)] });
        await db.execute({ sql: `DELETE FROM quest_deities WHERE deity_id=?`, args: [Number(id)] });
        const res = await db.execute({ sql: `DELETE FROM ${TABLE} WHERE id=?`, args: [Number(id)] });
        if ((res.rowsAffected ?? 0) === 0) return NextResponse.json({ error: 'Deity not found' }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Deity:', error);
        return NextResponse.json({ error: 'Failed to delete Deity' }, { status: 500 });
    }
}
