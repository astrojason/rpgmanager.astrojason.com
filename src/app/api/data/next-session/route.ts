import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';

const TABLE = 'next_session';

export async function GET(request?: NextRequest) {
  const authResult = await verifyRequestAuth(request);
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    const db = getDb();
    const res = await db.execute(`SELECT * FROM ${TABLE} LIMIT 1`);
    if (res.rows.length === 0) return NextResponse.json({});
    const r: Record<string, unknown> = res.rows[0];
    const data = {
      date: r.date ?? '',
      agenda: r.agenda ?? '',
      reminders: r.reminders ? JSON.parse(String(r.reminders)) : [],
      currentGameDate: r.currentGameDate ?? '',
      location: r.location ?? undefined,
      notes: r.notes ?? undefined,
      lastUpdated: r.lastUpdated ?? undefined,
      isSkipped: !!r.isSkipped,
      skipReason: r.skipReason ?? undefined,
    };
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading Next Session file:', error);
    return NextResponse.json({ error: 'Failed to load Next Session data' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  try {
    const db = getDb();
    const body = await request.json();
    const payload = {
      date: body.date ?? null,
      agenda: body.agenda ?? null,
      reminders: JSON.stringify(body.reminders ?? []),
      currentGameDate: body.currentGameDate ?? null,
      location: body.location ?? null,
      notes: body.notes ?? null,
      lastUpdated: body.lastUpdated ?? null,
      isSkipped: body.isSkipped ? 1 : 0,
      skipReason: body.skipReason ?? null,
    };
    await db.execute({
      sql: `INSERT INTO ${TABLE} (id,date,agenda,reminders,currentGameDate,location,notes,lastUpdated,isSkipped,skipReason)
                VALUES (1,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(id) DO UPDATE SET
                  date=excluded.date,
                  agenda=excluded.agenda,
                  reminders=excluded.reminders,
                  currentGameDate=excluded.currentGameDate,
                  location=excluded.location,
                  notes=excluded.notes,
                  lastUpdated=excluded.lastUpdated,
                  isSkipped=excluded.isSkipped,
                  skipReason=excluded.skipReason`,
      args: [payload.date, payload.agenda, payload.reminders, payload.currentGameDate, payload.location, payload.notes, payload.lastUpdated, payload.isSkipped, payload.skipReason]
    });
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error('Error updating Next Session:', error);
    return NextResponse.json({ error: 'Failed to update Next Session' }, { status: 500 });
  }
}
