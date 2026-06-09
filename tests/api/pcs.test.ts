import { describe, expect, it, vi } from 'vitest';
import { jsonRequest, mockDb, requestWithQuery } from '../test-utils';

describe('pcs endpoint', () => {
  it('returns PCs with faction ids', async () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Weledor',
            race: 'Bard',
            hometown: 'Stormharbor',
            status: 'active',
            class: 'Bard',
            player: 'Jason',
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ pc_id: 1, faction_id: 3 }] });

    const { GET } = await import('@/app/api/data/pcs/route');
    const res = await GET();
    expect(await res.json()).toEqual([
      {
        id: '1',
        name: 'Weledor',
        race: 'Bard',
        hometown: 'Stormharbor',
        status: 'active',
        class: 'Bard',
        player: 'Jason',
        notes: [],
        factions: ['3'],
      },
    ]);
  });

  it('creates PC within transaction', async () => {
    const txExecute = vi.fn()
      .mockResolvedValueOnce({ lastInsertRowid: 10 })
      .mockResolvedValue({ rowsAffected: 1 });
    const txCommit = vi.fn();
    const txRollback = vi.fn();
    mockDb.transaction.mockResolvedValueOnce({ execute: txExecute, commit: txCommit, rollback: txRollback });

    const { POST } = await import('@/app/api/data/pcs/route');
    const body = {
      name: 'Thodian',
      race: 'Cleric',
      hometown: 'Stormharbor',
      status: 'active',
      class: 'Cleric',
      factions: ['2'],
    };
    const res = await POST(jsonRequest('http://test/api/pcs', 'POST', body) as any);
    expect(txExecute).toHaveBeenCalled();
    expect(txCommit).toHaveBeenCalled();
    expect(await res.json()).toEqual({ success: true, data: { ...body, id: '10' } });
  });

  it('rolls back when PC update target missing', async () => {
    const txExecute = vi
      .fn()
      .mockResolvedValueOnce({ rowsAffected: 0 });
    const txCommit = vi.fn();
    const txRollback = vi.fn();
    mockDb.transaction.mockResolvedValueOnce({ execute: txExecute, commit: txCommit, rollback: txRollback });

    const { PUT } = await import('@/app/api/data/pcs/route');
    const res = await PUT(jsonRequest('http://test/api/pcs', 'PUT', { id: '1', factions: [] }) as any);
    expect(res.status).toBe(404);
    expect(txRollback).toHaveBeenCalled();
    expect(await res.json()).toEqual({ error: 'PC not found' });
  });

  it('bulk updates via PATCH', async () => {
    const txExecute = vi.fn().mockResolvedValue({ rowsAffected: 1 });
    const txCommit = vi.fn();
    const txRollback = vi.fn();
    mockDb.transaction.mockResolvedValueOnce({ execute: txExecute, commit: txCommit, rollback: txRollback });

    const { PATCH } = await import('@/app/api/data/pcs/route');
    const res = await PATCH(
      jsonRequest('http://test/api/pcs', 'PATCH', [
        { id: '1', name: 'Weledor', race: 'Bard', hometown: 'Stormharbor', status: 'active', class: 'Bard', factions: [] },
      ]) as any
    );
    expect(res.status).toBe(200);
    expect(txCommit).toHaveBeenCalled();
    expect(await res.json()).toMatchObject({ success: true });
  });

  it('validates delete path', async () => {
    const { DELETE } = await import('@/app/api/data/pcs/route');
    const bad = await DELETE(requestWithQuery('http://test/api/pcs') as any);
    expect(bad.status).toBe(400);

    // Test 404 case - transaction with 0 rows affected
    const txExecuteMissing = vi.fn()
      .mockResolvedValueOnce(undefined) // DELETE FROM junction
      .mockResolvedValueOnce({ rowsAffected: 0 }); // DELETE main table - not found
    const txCommitMissing = vi.fn();
    const txRollbackMissing = vi.fn();
    mockDb.transaction.mockResolvedValueOnce({ execute: txExecuteMissing, commit: txCommitMissing, rollback: txRollbackMissing });
    const missing = await DELETE(requestWithQuery('http://test/api/pcs?id=1') as any);
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
    const ok = await DELETE(requestWithQuery('http://test/api/pcs?id=1') as any);
    expect(ok.status).toBe(200);
    expect(txCommitOk).toHaveBeenCalled();
    expect(txRollbackOk).not.toHaveBeenCalled();
  });
});
