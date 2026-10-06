import { describe, expect, it } from 'vitest';
import { jsonRequest, mockDb, requestAsRole, requestWithQuery } from '../test-utils';

const row = { id: 1, title: 'The Sundering', category: 'History', content: 'Long ago...', hidden: 0, gm_notes: 'secret' };

describe('lore endpoint', () => {
  it('returns lore entries', async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [row] });
    const { GET } = await import('@/app/api/data/lore/route');
    const res = await GET();
    expect(await res.json()).toEqual([
      { id: '1', title: 'The Sundering', category: 'History', content: 'Long ago...', hidden: false, gm_notes: 'secret' },
    ]);
  });

  it('hides hidden entries and strips gm_notes for players', async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [row, { ...row, id: 2, title: 'Hidden', hidden: 1 }] });
    const { GET } = await import('@/app/api/data/lore/route');
    const res = await GET(requestAsRole('player') as any);
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].gm_notes).toBeUndefined();
  });

  it('creates a lore entry', async () => {
    mockDb.execute.mockResolvedValueOnce({ lastInsertRowid: 7 });
    const { POST } = await import('@/app/api/data/lore/route');
    const res = await POST(
      jsonRequest('http://test/api/lore', 'POST', { title: 'Runes', content: 'text' }) as any
    );
    expect(mockDb.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ sql: expect.stringContaining('INSERT INTO lore') })
    );
    expect(await res.json()).toMatchObject({ success: true, data: { id: '7', title: 'Runes' } });
  });

  it('returns 404 when updating a missing entry', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });
    const { PUT } = await import('@/app/api/data/lore/route');
    const res = await PUT(jsonRequest('http://test/api/lore', 'PUT', { id: '1', title: 'x', content: 'y' }) as any);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Lore entry not found' });
  });

  it('validates delete flow', async () => {
    const { DELETE } = await import('@/app/api/data/lore/route');
    const bad = await DELETE(requestWithQuery('http://test/api/lore') as any);
    expect(bad.status).toBe(400);
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });
    expect((await DELETE(requestWithQuery('http://test/api/lore?id=3') as any)).status).toBe(404);
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });
    expect((await DELETE(requestWithQuery('http://test/api/lore?id=3') as any)).status).toBe(200);
  });
});
