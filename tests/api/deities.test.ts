import { describe, expect, it } from 'vitest';
import { jsonRequest, mockDb } from '../test-utils';

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
