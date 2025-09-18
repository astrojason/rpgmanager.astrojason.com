import { NextResponse } from 'next/server';
import { getDb } from '@/lib/turso';

export async function GET() {
  try {
    const db = getDb();
    await db.execute('SELECT 1');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}

