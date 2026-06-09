import { describe, expect, it } from 'vitest';
import { jsonRequest, mockDb, requestWithQuery } from '../test-utils';

describe('session recaps endpoint', () => {
  it('lists recaps without mutation', async () => {
    mockDb.execute
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
      }) // SELECT * FROM session_recaps
      .mockResolvedValueOnce({ rows: [] }) // recap_npcs
      .mockResolvedValueOnce({ rows: [] }) // recap_locations
      .mockResolvedValueOnce({ rows: [] }) // recap_quests
      .mockResolvedValueOnce({ rows: [] }) // recap_items
      .mockResolvedValueOnce({ rows: [] }) // recap_factions
      .mockResolvedValueOnce({ rows: [] }); // recap_deities

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
        tagged_npcs: [],
        tagged_locations: [],
        tagged_quests: [],
        tagged_items: [],
        tagged_factions: [],
        tagged_deities: [],
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
      .mockResolvedValueOnce({ rowsAffected: 1 }); // UPDATE session_recaps WHERE id=

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

  it('updates recap with uuid sub-location id without error', async () => {
    const uuid = 'e1b5c9d3-0f6a-4d2e-9b3c-4d5e6f7a8b9c';
    mockDb.execute
      .mockResolvedValueOnce({ rowsAffected: 1 }); // UPDATE session_recaps WHERE id=

    const { PUT } = await import('@/app/api/data/session-recaps/route');
    const body = { id: '31', date: '2026-05-31', title: 'The Bloody Thorn', recap: 'Details', notes: [], tagged_npcs: [], tagged_locations: [uuid] };
    const res = await PUT(jsonRequest('http://test/api/recaps', 'PUT', body) as any);
    expect(res.status).toBe(200);

    const insertCall = mockDb.execute.mock.calls.find(
      (c: unknown[]) => typeof c[0] === 'object' && c[0] !== null && (c[0] as { sql?: string }).sql?.includes('INSERT OR IGNORE INTO recap_locations')
    );
    expect(insertCall).toBeDefined();
    expect((insertCall![0] as { args: unknown[] }).args[1]).toBe(uuid);
  });

  it('returns 404 when update target missing', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 }); // UPDATE WHERE id= affects 0 rows
    const { PUT } = await import('@/app/api/data/session-recaps/route');
    const res = await PUT(jsonRequest('http://test/api/recaps', 'PUT', { id: '99' }) as any);
    expect(res.status).toBe(404);
  });

  it('deletes recap by id', async () => {
    mockDb.execute
      .mockResolvedValueOnce({}) // DELETE recap_npcs
      .mockResolvedValueOnce({}) // DELETE recap_locations
      .mockResolvedValueOnce({}) // DELETE recap_quests
      .mockResolvedValueOnce({}) // DELETE recap_items
      .mockResolvedValueOnce({}) // DELETE recap_factions
      .mockResolvedValueOnce({}) // DELETE recap_deities
      .mockResolvedValueOnce({ rowsAffected: 1 }); // DELETE session_recaps
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

  it('PATCH updates notes for any authenticated user', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });

    const { PATCH } = await import('@/app/api/data/session-recaps/route');
    const res = await PATCH(jsonRequest('http://test/api/recaps', 'PATCH', { id: '5', notes: [{ id: 'n1', content: 'note', author: 'u1', timestamp: '' }] }) as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('PATCH returns 400 when id is missing', async () => {
    const { PATCH } = await import('@/app/api/data/session-recaps/route');
    const res = await PATCH(jsonRequest('http://test/api/recaps', 'PATCH', { notes: [] }) as any);
    expect(res.status).toBe(400);
  });

  it('PATCH returns 404 when recap not found', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });

    const { PATCH } = await import('@/app/api/data/session-recaps/route');
    const res = await PATCH(jsonRequest('http://test/api/recaps', 'PATCH', { id: '99', notes: [] }) as any);
    expect(res.status).toBe(404);
  });
});
