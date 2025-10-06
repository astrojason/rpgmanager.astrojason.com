import { describe, expect, it } from 'vitest';
import { ensureSchemaMock, jsonRequest, mockDb, requestWithQuery } from '../test-utils';

describe('timeline endpoint', () => {
  it('returns timeline entries', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          { id: 1, title: 'Event', date: '2025-01-01', description: 'desc', category: 'cat', gm_notes: 'notes' },
        ],
      });

    const { GET } = await import('@/app/api/data/timeline/route');
    const res = await GET();
    expect(ensureSchemaMock).toHaveBeenCalled();
    expect(await res.json()).toEqual([
      { id: '1', title: 'Event', date: '2025-01-01', description: 'desc', category: 'cat', gm_notes: 'notes' },
    ]);
  });

  it('creates a timeline event', async () => {
    mockDb.execute.mockResolvedValueOnce({ lastInsertRowid: 4 });
    const { POST } = await import('@/app/api/data/timeline/route');
    const res = await POST(
      jsonRequest('http://test/api/timeline', 'POST', {
        title: 'Battle',
        date: '2025-02-02',
        description: 'desc',
      }) as any
    );
    expect(await res.json()).toMatchObject({ success: true, data: { id: '4', title: 'Battle' } });
  });

  it('returns 404 when updating missing event', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });
    const { PUT } = await import('@/app/api/data/timeline/route');
    const res = await PUT(jsonRequest('http://test/api/timeline', 'PUT', { id: '1', title: 'Event', date: '', description: '' }) as any);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'Timeline event not found' });
  });

  it('validates delete flow', async () => {
    const { DELETE } = await import('@/app/api/data/timeline/route');
    const bad = await DELETE(requestWithQuery('http://test/api/timeline') as any);
    expect(bad.status).toBe(400);
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 });
    const missing = await DELETE(requestWithQuery('http://test/api/timeline?id=3') as any);
    expect(missing.status).toBe(404);
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 1 });
    const ok = await DELETE(requestWithQuery('http://test/api/timeline?id=3') as any);
    expect(ok.status).toBe(200);
  });
});
