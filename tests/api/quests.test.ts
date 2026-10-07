import { describe, expect, it } from 'vitest';
import { jsonRequest, mockDb, requestAsRole, requestWithQuery } from '../test-utils';

describe('quests endpoint', () => {
  it('lists quests with parsed notes', async () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Quest', notes: JSON.stringify(['step']), status: 'active', gm_notes: 'secret' },
        ],
      }) // SELECT * FROM quests
      .mockResolvedValueOnce({ rows: [] }) // quest_npcs
      .mockResolvedValueOnce({ rows: [] }) // quest_locations
      .mockResolvedValueOnce({ rows: [] }) // quest_factions
      .mockResolvedValueOnce({ rows: [] }); // quest_deities
    const { GET } = await import('@/app/api/data/quests/route');
    const res = await GET();
    expect(await res.json()).toEqual([
      { id: '1', name: 'Quest', notes: ['step'], status: 'active', hidden: false, gm_notes: 'secret', tagged_npcs: [], tagged_locations: [], tagged_factions: [], tagged_deities: [] },
    ]);
  });

  it('strips gm_notes from quests for players', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Quest', notes: '[]', status: 'active', gm_notes: 'secret' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const { GET } = await import('@/app/api/data/quests/route');
    const res = await GET(requestAsRole('player') as any);
    const data = await res.json();
    expect(data[0].gm_notes).toBeUndefined();
  });

  it('creates quest and returns id', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ lastInsertRowid: 3 });
    const { POST } = await import('@/app/api/data/quests/route');
    const res = await POST(jsonRequest('http://test/api/quests', 'POST', { name: 'Quest', notes: [] }) as any);
    expect(await res.json()).toMatchObject({ success: true, data: { id: '3', name: 'Quest' } });
  });

  it('returns 404 when updating missing quest', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });
    const { PUT } = await import('@/app/api/data/quests/route');
    const res = await PUT(jsonRequest('http://test/api/quests', 'PUT', { id: '1', name: 'Quest' }) as any);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Quest not found' });
  });

  it('validates delete path', async () => {
    const { DELETE } = await import('@/app/api/data/quests/route');
    const badReq = await DELETE(requestWithQuery('http://test/api/quests') as any);
    expect(badReq.status).toBe(400);
    mockDb.execute
      .mockResolvedValueOnce({}) // DELETE quest_npcs
      .mockResolvedValueOnce({}) // DELETE quest_locations
      .mockResolvedValueOnce({}) // DELETE quest_factions
      .mockResolvedValueOnce({}) // DELETE quest_deities
      .mockResolvedValueOnce({ rowsAffected: 0 }); // DELETE quest → 404
    const missing = await DELETE(requestWithQuery('http://test/api/quests?id=1') as any);
    expect(missing.status).toBe(404);
    mockDb.execute
      .mockResolvedValueOnce({}) // DELETE quest_npcs
      .mockResolvedValueOnce({}) // DELETE quest_locations
      .mockResolvedValueOnce({}) // DELETE quest_factions
      .mockResolvedValueOnce({}) // DELETE quest_deities
      .mockResolvedValueOnce({ rowsAffected: 1 }); // DELETE quest → 200
    const ok = await DELETE(requestWithQuery('http://test/api/quests?id=2') as any);
    expect(ok.status).toBe(200);
  });
  it('hides hidden quests from players', async () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Known Quest', notes: '[]', status: 'active', hidden: 0, gm_notes: null },
          { id: 2, name: 'Undiscovered Quest', notes: '[]', status: 'undiscovered', hidden: 1, gm_notes: null },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const { GET } = await import('@/app/api/data/quests/route');
    const res = await GET(requestAsRole('player') as any);
    const data = await res.json();
    expect(data.map((q: { name: string }) => q.name)).toEqual(['Known Quest']);
  });

  it('returns hidden quests to admins with hidden flag', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Undiscovered Quest', notes: '[]', status: 'active', hidden: 1, gm_notes: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const { GET } = await import('@/app/api/data/quests/route');
    const res = await GET(requestAsRole('admin') as any);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].hidden).toBe(true);
  });

  it('persists the hidden flag on create', async () => {
    mockDb.execute.mockResolvedValueOnce({ lastInsertRowid: 4 });
    const { POST } = await import('@/app/api/data/quests/route');
    await POST(jsonRequest('http://test/api/quests', 'POST', { name: 'Secret', notes: [], hidden: true }) as any);
    const call = mockDb.execute.mock.calls.find((c: any[]) => String(c[0]?.sql ?? '').startsWith('INSERT INTO quests'));
    expect(call?.[0].sql).toContain('hidden');
    expect(call?.[0].args).toContain(1);
  });

  it('persists the hidden flag on update', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });
    const { PUT } = await import('@/app/api/data/quests/route');
    await PUT(jsonRequest('http://test/api/quests', 'PUT', { id: '5', name: 'Secret', notes: [], hidden: false }) as any);
    const call = mockDb.execute.mock.calls.find((c: any[]) => String(c[0]?.sql ?? '').startsWith('UPDATE quests'));
    expect(call?.[0].sql).toContain('hidden=?');
    expect(call?.[0].args).toContain(0);
  });
});
