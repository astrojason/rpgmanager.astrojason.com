import { describe, expect, it } from 'vitest';
import { jsonRequest, mockDb, requestWithQuery } from '../test-utils';

describe('session recaps endpoint', () => {
  it('lists recaps without mutation', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            date: '2025-07-01',
            title: 'Adventure',
            recap: 'Details',
            author: 'DM',
            notes: JSON.stringify([]),
          },
        ],
      });

    const { GET } = await import('@/app/api/data/session-recaps/route');
    const res = await GET();
    expect(await res.json()).toEqual([
      {
        id: '1',
        date: '2025-07-01',
        title: 'Adventure',
        recap: 'Details',
        author: 'DM',
        notes: [],
      },
    ]);
  });

  it('creates recap and returns assigned id', async () => {
    mockDb.execute.mockResolvedValueOnce({ lastInsertRowid: 11 });
    const { POST } = await import('@/app/api/data/session-recaps/route');
    const res = await POST(
      jsonRequest('http://test/api/recaps', 'POST', {
        date: '2025-07-01',
        title: 'Adventure',
        recap: 'Details',
        notes: [],
      }) as any
    );
    expect(await res.json()).toEqual({
      success: true,
      data: {
        date: '2025-07-01',
        title: 'Adventure',
        recap: 'Details',
        notes: [],
        id: '11',
      },
    });
  });

  it('updates recap when found', async () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          { id: 5, date: '2025-07-01', title: 'Adventure', recap: 'Details', author: null, notes: JSON.stringify([]) },
        ],
      })
      .mockResolvedValueOnce({ rowsAffected: 1 });

    const { PUT } = await import('@/app/api/data/session-recaps/route');
    const body = {
      id: '5',
      date: '2025-07-01',
      title: 'Adventure',
      recap: 'Updated',
      notes: [],
    };
    const res = await PUT(jsonRequest('http://test/api/recaps', 'PUT', body) as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: body });
  });

  it('returns 404 when update target missing', async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    const { PUT } = await import('@/app/api/data/session-recaps/route');
    const res = await PUT(jsonRequest('http://test/api/recaps', 'PUT', { id: '99' }) as any);
    expect(res.status).toBe(404);
  });

  it('deletes recap by id', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });
    const { DELETE } = await import('@/app/api/data/session-recaps/route');
    const res = await DELETE(requestWithQuery('http://test/api/recaps?id=9') as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('validates delete id parameter', async () => {
    const { DELETE } = await import('@/app/api/data/session-recaps/route');
    const res = await DELETE(requestWithQuery('http://test/api/recaps') as any);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'ID is required' });
  });
});
