import { describe, expect, it } from 'vitest';
import { jsonRequest, mockDb, requestAsRole } from '../test-utils';

describe('items endpoint GET', () => {
  const mockRows = () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Plain Sword', category: 'Weapon', hidden: 0, gm_notes: 'mechanical secret', notes: '[]' },
          { id: 2, name: 'Cursed Ring', category: 'Magic Item', hidden: 1, gm_notes: 'very cursed', notes: '[]' },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // item_npcs
      .mockResolvedValueOnce({ rows: [] }) // item_pcs
      .mockResolvedValueOnce({ rows: [] }) // item_locations
      .mockResolvedValueOnce({ rows: [] }); // recap_items
  };

  it('returns hidden items and gm_notes to admins', async () => {
    mockRows();
    const { GET } = await import('@/app/api/data/items/route');
    const res = await GET(requestAsRole('admin') as any);
    const data = await res.json();
    expect(data.map((i: { id: string }) => i.id)).toEqual(['1', '2']);
    expect(data.find((i: { id: string }) => i.id === '1').gm_notes).toBe('mechanical secret');
  });

  it('hides hidden items and strips gm_notes for players', async () => {
    mockRows();
    const { GET } = await import('@/app/api/data/items/route');
    const res = await GET(requestAsRole('player') as any);
    const data = await res.json();
    expect(data.map((i: { id: string }) => i.id)).toEqual(['1']);
    expect(data[0].gm_notes).toBeUndefined();
  });
});

describe('items endpoint PATCH', () => {
  it('PATCH updates notes for any authenticated user', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });

    const { PATCH } = await import('@/app/api/data/items/route');
    const res = await PATCH(jsonRequest('http://test/api/items', 'PATCH', { id: '7', notes: [{ id: 'n1', content: 'note', author: 'u1', timestamp: '' }] }) as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('PATCH returns 400 when id is missing', async () => {
    const { PATCH } = await import('@/app/api/data/items/route');
    const res = await PATCH(jsonRequest('http://test/api/items', 'PATCH', { notes: [] }) as any);
    expect(res.status).toBe(400);
  });

  it('PATCH returns 404 when item not found', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });

    const { PATCH } = await import('@/app/api/data/items/route');
    const res = await PATCH(jsonRequest('http://test/api/items', 'PATCH', { id: '99', notes: [] }) as any);
    expect(res.status).toBe(404);
  });
});
