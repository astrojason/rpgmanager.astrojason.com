import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { verifyRequestAuth } from '@/lib/apiAuth';
import { withErrorHandling } from '@/lib/apiHelpers';

const TABLE = 'campaign_chapter';

export async function GET(request?: NextRequest) {
  const authResult = await verifyRequestAuth(request);
  if ('errorResponse' in authResult) return authResult.errorResponse;

  return withErrorHandling(async () => {
    const db = getDb();
    const res = await db.execute(`SELECT * FROM ${TABLE} LIMIT 1`);
    if (res.rows.length === 0) return NextResponse.json({});
    const r: Record<string, unknown> = res.rows[0];
    const data = {
      title: r.title ?? '',
      subtitle: r.subtitle ?? '',
      lastUpdated: r.lastUpdated ?? undefined,
    };
    return NextResponse.json(data);
  }, 'Error reading Campaign Chapter:', 'Failed to load Campaign Chapter data');
}

export async function PUT(request: NextRequest) {
  const authResult = await verifyRequestAuth(request, { allowedRoles: ['admin', 'dm'] });
  if ('errorResponse' in authResult) return authResult.errorResponse;

  return withErrorHandling(async () => {
    const db = getDb();
    const body = await request.json();
    const payload = {
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      lastUpdated: body.lastUpdated ?? null,
    };
    await db.execute({
      sql: `INSERT INTO ${TABLE} (id,title,subtitle,lastUpdated)
                VALUES (1,?,?,?)
                ON CONFLICT(id) DO UPDATE SET
                  title=excluded.title,
                  subtitle=excluded.subtitle,
                  lastUpdated=excluded.lastUpdated`,
      args: [payload.title, payload.subtitle, payload.lastUpdated],
    });
    return NextResponse.json({ success: true, data: body });
  }, 'Error updating Campaign Chapter:', 'Failed to update Campaign Chapter');
}
