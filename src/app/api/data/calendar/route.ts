import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { isPrivilegedRole, withErrorHandling } from '@/lib/apiHelpers';

const TABLE = 'calendar';

export async function GET(request?: NextRequest) {
  const authResult = await verifyRequestAuth(request);
  if ('errorResponse' in authResult) return authResult.errorResponse;

  return withErrorHandling(async () => {
    const db = getDb();
    const res = await db.execute(`SELECT * FROM ${TABLE} LIMIT 1`);
    if (res.rows.length === 0) return NextResponse.json({});
    const r: Record<string, unknown> = res.rows[0];
    const role = authResult.user?.role ?? null;
    const events: { dmOnly?: boolean }[] = r.events ? JSON.parse(String(r.events)) : [];
    const data = {
      name: r.name ?? '',
      description: r.description ?? '',
      showIntercalarySeparately: !!r.showIntercalarySeparately,
      current: { day: Number(r.current_day ?? 0), month: Number(r.current_month ?? 0), year: Number(r.current_year ?? 0) },
      static: r.static ? JSON.parse(String(r.static)) : {},
      events: isPrivilegedRole(role) ? events : events.filter(e => !e.dmOnly),
      categories: r.categories ? JSON.parse(String(r.categories)) : [],
    };
    return NextResponse.json(data);
  }, 'Error reading Calendar file:', 'Failed to load Calendar');
}

export async function PUT(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  return withErrorHandling(async () => {
    const db = getDb();
    const body = await request.json();
    const payload = {
      name: body.name ?? null,
      description: body.description ?? null,
      showIntercalarySeparately: body.showIntercalarySeparately ? 1 : 0,
      current_day: Number(body.current?.day ?? 0),
      current_month: Number(body.current?.month ?? 0),
      current_year: Number(body.current?.year ?? 0),
      static: JSON.stringify(body.static ?? {}),
      events: JSON.stringify(body.events ?? []),
      categories: JSON.stringify(body.categories ?? []),
    };
    await db.execute({
      sql: `INSERT INTO ${TABLE} (id,name,description,showIntercalarySeparately,current_day,current_month,current_year,static,events,categories)
                VALUES (1,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(id) DO UPDATE SET
                  name=excluded.name,
                  description=excluded.description,
                  showIntercalarySeparately=excluded.showIntercalarySeparately,
                  current_day=excluded.current_day,
                  current_month=excluded.current_month,
                  current_year=excluded.current_year,
                  static=excluded.static,
                  events=excluded.events,
                  categories=excluded.categories`,
      args: [
        payload.name,
        payload.description,
        payload.showIntercalarySeparately,
        payload.current_day,
        payload.current_month,
        payload.current_year,
        payload.static,
        payload.events,
        payload.categories,
      ]
    });
    return NextResponse.json({ success: true, data: body });
  }, 'Error updating Calendar:', 'Failed to update Calendar');
}
