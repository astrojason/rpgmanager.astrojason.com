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
      { id: '1', name: 'Quest', notes: ['step'], status: 'active', parent_id: null, parent_hidden: false, gm_notes: 'secret', tagged_npcs: [], tagged_locations: [], tagged_factions: [], tagged_deities: [] },
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
  it('hides undiscovered quests from players', async () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Known Quest', notes: '[]', status: 'active', gm_notes: null },
          { id: 2, name: 'Undiscovered Quest', notes: '[]', status: 'undiscovered', gm_notes: null },
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

  it('lets status alone decide visibility, ignoring any leftover hidden column', async () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Stale Hidden Flag', notes: '[]', status: 'active', hidden: 1, gm_notes: null },
          { id: 2, name: 'Undiscovered', notes: '[]', status: 'undiscovered', hidden: 0, gm_notes: null },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const { GET } = await import('@/app/api/data/quests/route');
    const data = await (await GET(requestAsRole('player') as any)).json();
    expect(data.map((q: { name: string }) => q.name)).toEqual(['Stale Hidden Flag']);
  });

  it('does not expose a hidden field on quests', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Quest', notes: '[]', status: 'undiscovered', hidden: 1, gm_notes: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const { GET } = await import('@/app/api/data/quests/route');
    const data = await (await GET(requestAsRole('admin') as any)).json();
    expect(data).toHaveLength(1);
    expect(data[0]).not.toHaveProperty('hidden');
  });

  it('does not write a hidden column on create', async () => {
    mockDb.execute.mockResolvedValueOnce({ lastInsertRowid: 4 });
    const { POST } = await import('@/app/api/data/quests/route');
    await POST(jsonRequest('http://test/api/quests', 'POST', { name: 'Secret', notes: [], hidden: true }) as any);
    const call = mockDb.execute.mock.calls.find((c: any[]) => String(c[0]?.sql ?? '').startsWith('INSERT INTO quests'));
    expect(call?.[0].sql).not.toMatch(/\bhidden\b/);
  });

  it('does not write a hidden column on update', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });
    const { PUT } = await import('@/app/api/data/quests/route');
    await PUT(jsonRequest('http://test/api/quests', 'PUT', { id: '5', name: 'Secret', notes: [], hidden: false }) as any);
    const call = mockDb.execute.mock.calls.find((c: any[]) => String(c[0]?.sql ?? '').startsWith('UPDATE quests'));
    expect(call?.[0].sql).not.toMatch(/\bhidden\b/);
  });

  it('returns undiscovered quests to admins', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [{ id: 2, name: 'Undiscovered Quest', notes: '[]', status: 'undiscovered', gm_notes: null }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const { GET } = await import('@/app/api/data/quests/route');
    const res = await GET(requestAsRole('admin') as any);
    expect(await res.json()).toHaveLength(1);
  });

  it('treats an admin sending x-view-as: player like a player', async () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Known Quest', notes: '[]', status: 'active', gm_notes: 'secret' },
          { id: 2, name: 'Undiscovered Quest', notes: '[]', status: 'undiscovered', gm_notes: null },
        ],
      })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const { GET } = await import('@/app/api/data/quests/route');
    const req = new Request('http://test/api', { headers: { 'x-test-role': 'admin', 'x-view-as': 'player' } });
    const data = await (await GET(req as any)).json();
    expect(data).toHaveLength(1);
    expect(data[0].gm_notes).toBeUndefined();
  });

  describe('parent quests', () => {
    const mockQuestRows = (rows: Record<string, unknown>[]) =>
      mockDb.execute
        .mockResolvedValueOnce({ rows })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
    const parent = { id: 5, name: 'Parent', notes: '[]', status: 'active', gm_notes: null, parent_id: null, parent_hidden: 0 };

    it('returns parent_id and parent_hidden to admins', async () => {
      mockQuestRows([parent, { id: 6, name: 'Child', notes: '[]', status: 'active', gm_notes: null, parent_id: 5, parent_hidden: 1 }]);
      const { GET } = await import('@/app/api/data/quests/route');
      const data = await (await GET(requestAsRole('admin') as any)).json();
      expect(data[0]).toMatchObject({ parent_id: null, parent_hidden: false });
      expect(data[1]).toMatchObject({ parent_id: '5', parent_hidden: true });
    });

    it('shows players the parent link when it is not hidden', async () => {
      mockQuestRows([parent, { id: 6, name: 'Child', notes: '[]', status: 'active', gm_notes: null, parent_id: 5, parent_hidden: 0 }]);
      const { GET } = await import('@/app/api/data/quests/route');
      const data = await (await GET(requestAsRole('player') as any)).json();
      expect(data[1].parent_id).toBe('5');
    });

    it('strips a hidden parent link from players, including the flag itself', async () => {
      mockQuestRows([parent, { id: 6, name: 'Child', notes: '[]', status: 'active', gm_notes: null, parent_id: 5, parent_hidden: 1 }]);
      const { GET } = await import('@/app/api/data/quests/route');
      const data = await (await GET(requestAsRole('player') as any)).json();
      expect(data[1].parent_id).toBeNull();
      expect(data[1]).not.toHaveProperty('parent_hidden');
    });

    it('strips the parent link from players when the parent is undiscovered', async () => {
      mockQuestRows([
        { ...parent, status: 'undiscovered' },
        { id: 6, name: 'Child', notes: '[]', status: 'active', gm_notes: null, parent_id: 5, parent_hidden: 0 },
      ]);
      const { GET } = await import('@/app/api/data/quests/route');
      const data = await (await GET(requestAsRole('player') as any)).json();
      expect(data).toHaveLength(1);
      expect(data[0].parent_id).toBeNull();
    });

    it('writes parent_id and parent_hidden on create', async () => {
      mockDb.execute.mockResolvedValueOnce({ rows: [{ parent_id: null }] }); // ancestor lookup
      mockDb.execute.mockResolvedValueOnce({ lastInsertRowid: 7 });
      const { POST } = await import('@/app/api/data/quests/route');
      await POST(jsonRequest('http://test/api/quests', 'POST', { name: 'Sub', notes: [], parent_id: '5', parent_hidden: true }) as any);
      const call = mockDb.execute.mock.calls.find((c: any[]) => String(c[0]?.sql ?? '').startsWith('INSERT INTO quests'));
      expect(call?.[0].sql).toContain('parent_id');
      expect(call?.[0].sql).toContain('parent_hidden');
      expect(call?.[0].args).toEqual(expect.arrayContaining([5, 1]));
    });

    it('stores a null parent when none is chosen', async () => {
      mockDb.execute.mockResolvedValueOnce({ lastInsertRowid: 8 });
      const { POST } = await import('@/app/api/data/quests/route');
      await POST(jsonRequest('http://test/api/quests', 'POST', { name: 'Solo', notes: [] }) as any);
      const call = mockDb.execute.mock.calls.find((c: any[]) => String(c[0]?.sql ?? '').startsWith('INSERT INTO quests'));
      expect(call?.[0].args).toEqual(['Solo', '[]', 'active', null, null, 0]);
    });

    it('rejects a quest as its own parent', async () => {
      const { PUT } = await import('@/app/api/data/quests/route');
      const res = await PUT(jsonRequest('http://test/api/quests', 'PUT', { id: '5', name: 'Q', notes: [], parent_id: '5' }) as any);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/own parent/i);
    });

    it('rejects a parent that would create a cycle', async () => {
      // Making 1 a child of 2, but 2 is already a child of 1.
      mockDb.execute.mockResolvedValueOnce({ rows: [{ parent_id: 1 }] }); // parent of 2 -> 1
      const { PUT } = await import('@/app/api/data/quests/route');
      const res = await PUT(jsonRequest('http://test/api/quests', 'PUT', { id: '1', name: 'Q', notes: [], parent_id: '2' }) as any);
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/cycle|descendant/i);
    });

    it('updates the parent link when valid', async () => {
      mockDb.execute.mockResolvedValueOnce({ rows: [{ parent_id: null }] }); // parent of 2 has no parent
      mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });
      const { PUT } = await import('@/app/api/data/quests/route');
      const res = await PUT(jsonRequest('http://test/api/quests', 'PUT', { id: '3', name: 'Q', notes: [], parent_id: '2', parent_hidden: true }) as any);
      expect(res.status).toBe(200);
      const call = mockDb.execute.mock.calls.find((c: any[]) => String(c[0]?.sql ?? '').startsWith('UPDATE quests'));
      expect(call?.[0].sql).toContain('parent_id=?');
      expect(call?.[0].sql).toContain('parent_hidden=?');
      expect(call?.[0].args).toEqual(expect.arrayContaining([2, 1]));
    });

    it('clears the parent link when parent_id is empty', async () => {
      mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });
      const { PUT } = await import('@/app/api/data/quests/route');
      await PUT(jsonRequest('http://test/api/quests', 'PUT', { id: '3', name: 'Q', notes: [], parent_id: null, parent_hidden: true }) as any);
      const call = mockDb.execute.mock.calls.find((c: any[]) => String(c[0]?.sql ?? '').startsWith('UPDATE quests'));
      expect(call?.[0].args).toEqual(expect.arrayContaining([null]));
      expect(call?.[0].args).not.toContain(1); // a hidden flag on no link is meaningless
    });
  });
});
