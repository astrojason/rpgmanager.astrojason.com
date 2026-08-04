import { describe, expect, it, vi } from 'vitest';
import { jsonRequest, mockDb, requestAsRole, requestWithQuery } from '../test-utils';

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
            hidden: 0,
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
        hidden: false,
        gm_notes: 'secret',
        notes: [],
      },
    ]);
  });

  it('strips gm_notes from factions for players', async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ id: '1', name: 'Order of Dawn', gm_notes: 'secret' }],
    });

    const { GET } = await import('@/app/api/data/factions/route');
    const res = await GET(requestAsRole('player') as any);
    const data = await res.json();
    expect(data[0].gm_notes).toBeUndefined();
  });

  it('hides hidden factions for players but not for admins', async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        { id: '1', name: 'Order of Dawn', hidden: 0 },
        { id: '2', name: 'The Gilded Coil', hidden: 1 },
      ],
    });
    const { GET } = await import('@/app/api/data/factions/route');
    const res = await GET(requestAsRole('player') as any);
    const data = await res.json();
    expect(data.map((f: { id: string }) => f.id)).toEqual(['1']);
  });

  it('returns hidden factions to admins', async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ id: '2', name: 'The Gilded Coil', hidden: 1 }],
    });
    const { GET } = await import('@/app/api/data/factions/route');
    const res = await GET(requestAsRole('admin') as any);
    const data = await res.json();
    expect(data.map((f: { id: string }) => f.id)).toEqual(['2']);
    expect(data[0].hidden).toBe(true);
  });

  it('creates a faction and returns a new id', async () => {
    mockDb.execute.mockResolvedValueOnce({ lastInsertRowid: 9 });
    const payload = { name: 'Order', hidden: true };
    const { POST } = await import('@/app/api/data/factions/route');
    const res = await POST(jsonRequest('http://test/api/factions', 'POST', payload) as any);
    expect(mockDb.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining('INSERT INTO factions'),
        args: expect.arrayContaining([1]),
      })
    );
    expect(await res.json()).toMatchObject({ success: true, data: { ...payload, id: '9' } });
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
