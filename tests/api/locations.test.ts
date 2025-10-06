import { describe, expect, it } from 'vitest';
import { ensureSchemaMock, jsonRequest, mockDb, requestWithQuery } from '../test-utils';

describe('locations endpoint', () => {
  it('returns locations with parsed fields', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
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
            locations: JSON.stringify(['Inner Harbor']),
          },
        ],
      });

    const { GET } = await import('@/app/api/data/locations/route');
    const res = await GET();
    expect(ensureSchemaMock).toHaveBeenCalled();
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
        locations: ['Inner Harbor'],
      },
    ]);
  });

  it('creates location and returns new id', async () => {
    mockDb.execute.mockResolvedValueOnce({ lastInsertRowid: 9 });
    const { POST } = await import('@/app/api/data/locations/route');
    const res = await POST(
      jsonRequest('http://test/api/locations', 'POST', {
        name: 'Sandhaven',
        teaser: 'teaser',
        detail: 'detail',
      }) as any
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
