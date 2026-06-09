import { describe, expect, it, vi } from 'vitest';
import { jsonRequest, mockDb, requestWithQuery } from '../test-utils';

describe('factions endpoint', () => {
  it('returns transformed factions list', async () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            name: 'Order of Dawn',
            pronunciation: 'order',
            type: 'guild',
            description: 'desc',
            location: 'city',
            status: 'active',
            goals: 'goals',
            background: 'background',
            relationships: JSON.stringify(['ally']),
            image: 'img.png',
            gm_notes: 'secret',
          },
        ],
      });

    const { GET } = await import('@/app/api/data/factions/route');
    const res = await GET();
    expect(await res.json()).toEqual([
      {
        id: '1',
        name: 'Order of Dawn',
        pronunciation: 'order',
        type: 'guild',
        description: 'desc',
        location: 'city',
        status: 'active',
        goals: 'goals',
        background: 'background',
        relationships: ['ally'],
        image: 'img.png',
        gm_notes: 'secret',
        notes: [],
      },
    ]);
  });

  it('creates a faction with provided id', async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    const payload = { id: 'abc', name: 'Order' };
    const { POST } = await import('@/app/api/data/factions/route');
    const res = await POST(jsonRequest('http://test/api/factions', 'POST', payload) as any);
    expect(mockDb.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ sql: expect.stringContaining('INSERT INTO factions') })
    );
    expect(await res.json()).toMatchObject({ success: true, data: payload });
  });

  it('returns 404 when updating missing faction', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });
    const { PUT } = await import('@/app/api/data/factions/route');
    const res = await PUT(jsonRequest('http://test/api/factions', 'PUT', { id: 'missing' }) as any);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Faction not found' });
  });

  it('validates id on delete', async () => {
    const { DELETE } = await import('@/app/api/data/factions/route');
    const res = await DELETE(requestWithQuery('http://test/api/factions') as any);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Faction ID is required' });
  });

  it('returns 404 when delete misses row', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });
    const { DELETE } = await import('@/app/api/data/factions/route');
    const res = await DELETE(requestWithQuery('http://test/api/factions?id=1') as any);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Faction not found' });
  });

  it('deletes faction successfully', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });
    const { DELETE } = await import('@/app/api/data/factions/route');
    const res = await DELETE(requestWithQuery('http://test/api/factions?id=2') as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });
});
