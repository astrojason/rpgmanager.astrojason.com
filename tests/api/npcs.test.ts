import { describe, expect, it, vi } from 'vitest';
import { jsonRequest, mockDb, requestWithQuery } from '../test-utils';

describe('npcs endpoint', () => {
  it('returns NPCs with factions and notes', async () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          {
            id: 42,
            name: 'Inara',
            pronunciation: 'ih-NAH-rah',
            race: 'Human',
            gender: 'Female',
            location: 'Sandhaven',
            status: 'alive',
            description: 'Queen of Sandhaven',
            notes: JSON.stringify(['note']),
            hidden: 0,
            nameHidden: 0,
            hide_name: 0,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ npc_id: 42, faction_id: 5 }] });

    const { GET } = await import('@/app/api/data/npcs/route');
    const res = await GET();
    expect(await res.json()).toEqual([
      expect.objectContaining({
        id: '42',
        name: 'Inara',
        race: 'Human',
        factions: ['5'],
        notes: ['note'],
      }),
    ]);
  });

  it('creates NPC through transaction', async () => {
    const txExecute = vi.fn().mockResolvedValueOnce({ lastInsertRowid: 8 });
    const txCommit = vi.fn();
    const txRollback = vi.fn();
    mockDb.transaction.mockResolvedValueOnce({ execute: txExecute, commit: txCommit, rollback: txRollback });

    const { POST } = await import('@/app/api/data/npcs/route');
    const body = {
      name: 'Inara',
      race: 'Human',
      gender: 'Female',
      location: 'Sandhaven',
      status: 'alive',
      description: 'Queen',
      notes: [],
      factions: ['5'],
    };
    const res = await POST(jsonRequest('http://test/api/npcs', 'POST', body) as any);
    expect(txExecute).toHaveBeenCalled();
    expect(txCommit).toHaveBeenCalled();
    expect(await res.json()).toEqual({ success: true, data: { ...body, id: '8' } });
  });

  it('returns 404 when updating missing NPC', async () => {
    const txExecute = vi.fn().mockResolvedValueOnce({ rowsAffected: 0 });
    const txCommit = vi.fn();
    const txRollback = vi.fn();
    mockDb.transaction.mockResolvedValueOnce({ execute: txExecute, commit: txCommit, rollback: txRollback });

    const { PUT } = await import('@/app/api/data/npcs/route');
    const res = await PUT(jsonRequest('http://test/api/npcs', 'PUT', { id: '1', factions: [] }) as any);
    expect(res.status).toBe(404);
    expect(txRollback).toHaveBeenCalled();
  });

  it('PATCH updates notes for any authenticated user', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });

    const { PATCH } = await import('@/app/api/data/npcs/route');
    const res = await PATCH(jsonRequest('http://test/api/npcs', 'PATCH', { id: '42', notes: [{ id: 'n1', content: 'hello', author: 'u1', timestamp: '' }] }) as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('PATCH returns 400 when id is missing', async () => {
    const { PATCH } = await import('@/app/api/data/npcs/route');
    const res = await PATCH(jsonRequest('http://test/api/npcs', 'PATCH', { notes: [] }) as any);
    expect(res.status).toBe(400);
  });

  it('PATCH returns 404 when NPC not found', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });

    const { PATCH } = await import('@/app/api/data/npcs/route');
    const res = await PATCH(jsonRequest('http://test/api/npcs', 'PATCH', { id: '99', notes: [] }) as any);
    expect(res.status).toBe(404);
  });

  it('validates delete id parameter', async () => {
    const { DELETE } = await import('@/app/api/data/npcs/route');
    const bad = await DELETE(requestWithQuery('http://test/api/npcs') as any);
    expect(bad.status).toBe(400);

    // Test 404 case - transaction with 0 rows affected
    const txExecuteMissing = vi.fn()
      .mockResolvedValueOnce(undefined) // DELETE FROM junction
      .mockResolvedValueOnce({ rowsAffected: 0 }); // DELETE main table - not found
    const txCommitMissing = vi.fn();
    const txRollbackMissing = vi.fn();
    mockDb.transaction.mockResolvedValueOnce({ execute: txExecuteMissing, commit: txCommitMissing, rollback: txRollbackMissing });
    const missing = await DELETE(requestWithQuery('http://test/api/npcs?id=1') as any);
    expect(missing.status).toBe(404);
    expect(txRollbackMissing).toHaveBeenCalled();
    expect(txCommitMissing).not.toHaveBeenCalled();

    // Test success case - transaction with 1 row affected
    const txExecuteOk = vi.fn()
      .mockResolvedValueOnce(undefined) // DELETE FROM junction
      .mockResolvedValueOnce({ rowsAffected: 1 }); // DELETE main table - success
    const txCommitOk = vi.fn();
    const txRollbackOk = vi.fn();
    mockDb.transaction.mockResolvedValueOnce({ execute: txExecuteOk, commit: txCommitOk, rollback: txRollbackOk });
    const ok = await DELETE(requestWithQuery('http://test/api/npcs?id=1') as any);
    expect(ok.status).toBe(200);
    expect(txCommitOk).toHaveBeenCalled();
    expect(txRollbackOk).not.toHaveBeenCalled();
  });
});
