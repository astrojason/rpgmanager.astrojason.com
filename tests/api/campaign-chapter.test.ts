import { describe, expect, it } from 'vitest';
import { jsonRequest, mockDb } from '../test-utils';

describe('campaign-chapter endpoint', () => {
  it('returns chapter data', async () => {
    mockDb.execute.mockResolvedValueOnce({
      rows: [
        {
          title: 'The Hellhound Vigil',
          arc: 'stormharbor arc',
          lastUpdated: '2026-08-01',
        },
      ],
    });
    const { GET } = await import('@/app/api/data/campaign-chapter/route');
    const res = await GET();
    expect(await res.json()).toEqual({
      title: 'The Hellhound Vigil',
      arc: 'stormharbor arc',
      lastUpdated: '2026-08-01',
    });
  });

  it('returns empty object when no row exists', async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    const { GET } = await import('@/app/api/data/campaign-chapter/route');
    const res = await GET();
    expect(await res.json()).toEqual({});
  });

  it('upserts chapter payload', async () => {
    mockDb.execute.mockResolvedValue({ rows: [] });
    const body = {
      title: 'The Hellhound Vigil',
      arc: 'stormharbor arc',
      lastUpdated: '2026-08-09',
    };
    const { PUT } = await import('@/app/api/data/campaign-chapter/route');
    const res = await PUT(jsonRequest('http://test/api/campaign-chapter', 'PUT', body) as any);
    expect(mockDb.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ sql: expect.stringContaining('INSERT INTO campaign_chapter') })
    );
    expect(await res.json()).toEqual({ success: true, data: body });
  });
});
