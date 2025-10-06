import { describe, expect, it, vi } from 'vitest';
import { jsonRequest, mockDb, requestWithQuery } from '../test-utils';

describe('npcs endpoint', () => {
  it('returns NPCs with factions and notes', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
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

  it('validates delete id parameter', async () => {
    const { DELETE } = await import('@/app/api/data/npcs/route');
    const bad = await DELETE(requestWithQuery('http://test/api/npcs') as any);
    expect(bad.status).toBe(400);
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });
    const missing = await DELETE(requestWithQuery('http://test/api/npcs?id=1') as any);
    expect(missing.status).toBe(404);
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });
    const ok = await DELETE(requestWithQuery('http://test/api/npcs?id=1') as any);
    expect(ok.status).toBe(200);
  });
});
