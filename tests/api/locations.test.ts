import { describe, expect, it } from 'vitest';
import { jsonRequest, mockDb, requestAsRole, requestWithQuery } from '../test-utils';

describe('locations endpoint', () => {
  it('returns locations with parsed fields', async () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          {
            id: 7,
            name: 'Sandhaven',
            pronunciation: 'sand',
            mapImg: 'map.png',
            x: 1.5,
            y: 2.5,
            width: 3,
            height: 4,
            teaser: 'teaser',
            detail: 'detail',
            gm_notes: 'secret',
            hidden: 0,
            locations: JSON.stringify(['Inner Harbor']),
          },
        ],
      });

    const { GET } = await import('@/app/api/data/locations/route');
    const res = await GET();
    expect(await res.json()).toEqual([
      {
        id: '7',
        name: 'Sandhaven',
        pronunciation: 'sand',
        mapImg: 'map.png',
        x: 1.5,
        y: 2.5,
        width: 3,
        height: 4,
        teaser: 'teaser',
        detail: 'detail',
        gm_notes: 'secret',
        hidden: false,
        locations: ['Inner Harbor'],
        notes: [],
      },
    ]);
  });

  it('strips gm_notes from locations for players', async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        { id: 7, name: 'Sandhaven', teaser: 'teaser', detail: 'detail', gm_notes: 'secret' },
      ],
    });

    const { GET } = await import('@/app/api/data/locations/route');
    const res = await GET(requestAsRole('player') as any);
    const data = await res.json();
    expect(data[0].gm_notes).toBeUndefined();
  });

  it('hides hidden locations for players but not for admins', async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        { id: 7, name: 'Sandhaven', teaser: 't', detail: 'd', hidden: 0 },
        { id: 8, name: 'Obsidian Spire', teaser: 't', detail: 'd', hidden: 1 },
      ],
    });
    const { GET } = await import('@/app/api/data/locations/route');
    const res = await GET(requestAsRole('player') as any);
    const data = await res.json();
    expect(data.map((l: { id: string }) => l.id)).toEqual(['7']);
  });

  it('returns hidden locations to admins', async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [{ id: 8, name: 'Obsidian Spire', teaser: 't', detail: 'd', hidden: 1 }],
    });
    const { GET } = await import('@/app/api/data/locations/route');
    const res = await GET(requestAsRole('admin') as any);
    const data = await res.json();
    expect(data.map((l: { id: string }) => l.id)).toEqual(['8']);
    expect(data[0].hidden).toBe(true);
  });

  it('creates location and returns new id', async () => {
    mockDb.execute.mockResolvedValueOnce({ lastInsertRowid: 9 });
    const { POST } = await import('@/app/api/data/locations/route');
    const res = await POST(
      jsonRequest('http://test/api/locations', 'POST', {
        name: 'Sandhaven',
        teaser: 'teaser',
        detail: 'detail',
        hidden: true,
      }) as any
    );
    expect(mockDb.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({
        sql: expect.stringContaining('INSERT INTO locations'),
        args: expect.arrayContaining([1]),
      })
    );
    expect(await res.json()).toMatchObject({
      success: true,
      data: { id: '9', name: 'Sandhaven' },
    });
  });

  it('returns 404 on update miss', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });
    const { PUT } = await import('@/app/api/data/locations/route');
    const res = await PUT(
      jsonRequest('http://test/api/locations', 'PUT', { id: '1', name: 'Nowhere', teaser: '', detail: '' }) as any
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Location not found' });
  });

  it('handles delete validation and success', async () => {
    const { DELETE } = await import('@/app/api/data/locations/route');
    const missing = await DELETE(requestWithQuery('http://test/api/locations') as any);
    expect(missing.status).toBe(400);
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });
    const notFound = await DELETE(requestWithQuery('http://test/api/locations?id=99') as any);
    expect(notFound.status).toBe(404);
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });
    const ok = await DELETE(requestWithQuery('http://test/api/locations?id=2') as any);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ success: true });
  });
});
