import { describe, expect, it } from 'vitest';
import { mockDb } from '../test-utils';

describe('health endpoint', () => {
  it('returns ok when database responds', async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    const { GET } = await import('@/app/api/health/route');
    const res = await GET();
    expect(mockDb.execute).toHaveBeenCalledWith('SELECT 1');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('returns error payload on failure', async () => {
    mockDb.execute.mockRejectedValueOnce(new Error('db down'));
    const { GET } = await import('@/app/api/health/route');
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error).toContain('db down');
  });
});
