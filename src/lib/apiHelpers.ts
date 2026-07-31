import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';
import { ServerUserRole, verifyRequestAuth } from '@/lib/apiAuth';

export function isPrivilegedRole(role: ServerUserRole): boolean {
  return role === 'admin' || role === 'dm';
}

/**
 * Server-side enforcement of the "hidden from players" / "GM notes" concepts: drops rows
 * marked hidden and strips gm_notes for anyone who isn't admin/dm. Must run on every GET
 * route that returns hidden/gm_notes fields — the client-side badges/filters are a UX
 * layer on top, not the access-control boundary.
 */
export function filterForRole<T extends { hidden?: boolean; gm_notes?: string | null }>(
  rows: T[],
  role: ServerUserRole
): T[] {
  if (isPrivilegedRole(role)) return rows;
  return rows
    .filter(row => !row.hidden)
    .map(row => {
      if (row.gm_notes === undefined) return row;
      const copy = { ...row };
      delete copy.gm_notes;
      return copy;
    });
}

export function requireId(
  searchParams: URLSearchParams,
  idRequiredMessage: string
): { id: string } | { error: NextResponse } {
  const id = searchParams.get('id');
  if (!id) {
    return { error: NextResponse.json({ error: idRequiredMessage }, { status: 400 }) };
  }
  return { id };
}

export function notFound(notFoundMessage: string): NextResponse {
  return NextResponse.json({ error: notFoundMessage }, { status: 404 });
}

export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  logLabel: string,
  failureMessage: string
): Promise<T | NextResponse> {
  try {
    return await operation();
  } catch (error) {
    console.error(logLabel, error);
    return NextResponse.json({ error: failureMessage }, { status: 500 });
  }
}

interface NotesPatchConfig {
  table: string;
  idRequiredMessage: string;
  notFoundMessage: string;
  updateFailedMessage: string;
  logLabel: string;
  /** Most tables use an autoincrement integer id; a few (e.g. factions) use a string UUID id. */
  idType?: 'number' | 'string';
}

/**
 * Factory for the "notes-only" PATCH handler shape repeated verbatim across most
 * /api/data/<entity> routes: validate id, overwrite the notes column, 404 if no row matched.
 */
export function notesPatchHandler(config: NotesPatchConfig) {
  return async function PATCH(request: NextRequest) {
    const authResult = await verifyRequestAuth(request);
    if ('errorResponse' in authResult) return authResult.errorResponse;

    return withErrorHandling(async () => {
      const db = getDb();
      const body: { id?: string; notes?: unknown[] } = await request.json();
      if (!body.id) return NextResponse.json({ error: config.idRequiredMessage }, { status: 400 });

      const idArg = config.idType === 'string' ? body.id : Number(body.id);
      const res = await db.execute({
        sql: `UPDATE ${config.table} SET notes=? WHERE id=?`,
        args: [JSON.stringify(body.notes ?? []), idArg],
      });
      if ((res.rowsAffected ?? 0) === 0) return notFound(config.notFoundMessage);
      return NextResponse.json({ success: true });
    }, config.logLabel, config.updateFailedMessage);
  };
}
