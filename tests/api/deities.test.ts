import { describe, expect, it } from 'vitest';
import { jsonRequest, mockDb, requestAsRole } from '../test-utils';

describe('deities endpoint GET', () => {
  const mockRows = () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Visible One', hidden: 0, gm_notes: 'secret lore', notes: '[]' },
          { id: 2, name: 'Secret One', hidden: 1, gm_notes: 'very secret', notes: '[]' },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }) // recap_deities
      .mockResolvedValueOnce({ rows: [] }) // quest_deities
      .mockResolvedValueOnce({ rows: [] }) // deity_follower_npcs
      .mockResolvedValueOnce({ rows: [] }); // deity_follower_pcs
  };

  it('returns hidden deities and gm_notes to admins', async () => {
    mockRows();
    const { GET } = await import('@/app/api/data/deities/route');
    const res = await GET(requestAsRole('admin') as any);
    const data = await res.json();
    expect(data.map((d: { id: string }) => d.id)).toEqual(['1', '2']);
    expect(data.find((d: { id: string }) => d.id === '1').gm_notes).toBe('secret lore');
  });

  it('returns hidden deities and gm_notes to DMs', async () => {
    mockRows();
    const { GET } = await import('@/app/api/data/deities/route');
    const res = await GET(requestAsRole('dm') as any);
    const data = await res.json();
    expect(data.map((d: { id: string }) => d.id)).toEqual(['1', '2']);
  });

  it('hides hidden deities and strips gm_notes for players', async () => {
    mockRows();
    const { GET } = await import('@/app/api/data/deities/route');
    const res = await GET(requestAsRole('player') as any);
    const data = await res.json();
    expect(data.map((d: { id: string }) => d.id)).toEqual(['1']);
    expect(data[0].gm_notes).toBeUndefined();
  });
});

describe('deities endpoint PATCH', () => {
  it('PATCH updates notes for any authenticated user', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });

    const { PATCH } = await import('@/app/api/data/deities/route');
    const res = await PATCH(jsonRequest('http://test/api/deities', 'PATCH', { id: '3', notes: [{ id: 'n1', content: 'note', author: 'u1', timestamp: '' }] }) as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
  });

  it('PATCH returns 400 when id is missing', async () => {
    const { PATCH } = await import('@/app/api/data/deities/route');
    const res = await PATCH(jsonRequest('http://test/api/deities', 'PATCH', { notes: [] }) as any);
    expect(res.status).toBe(400);
  });

  it('PATCH returns 404 when deity not found', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });

    const { PATCH } = await import('@/app/api/data/deities/route');
    const res = await PATCH(jsonRequest('http://test/api/deities', 'PATCH', { id: '99', notes: [] }) as any);
    expect(res.status).toBe(404);
  });
});
