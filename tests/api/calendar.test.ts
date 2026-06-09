import { describe, expect, it } from 'vitest';
import { jsonRequest, mockDb } from '../test-utils';

describe('calendar endpoint', () => {
  it('returns parsed calendar entry', async () => {
    mockDb.execute
      .mockResolvedValueOnce({
        rows: [
          {
            name: 'Azorian',
            description: 'desc',
            showIntercalarySeparately: 1,
            current_day: 5,
            current_month: 4,
            current_year: 427,
            static: JSON.stringify({ months: [] }),
            events: JSON.stringify([{ name: 'Festival' }]),
            categories: JSON.stringify(['seasonal']),
          },
        ],
      });

    const { GET } = await import('@/app/api/data/calendar/route');
    const res = await GET();
    expect(await res.json()).toEqual({
      name: 'Azorian',
      description: 'desc',
      showIntercalarySeparately: true,
      current: { day: 5, month: 4, year: 427 },
      static: { months: [] },
      events: [{ name: 'Festival' }],
      categories: ['seasonal'],
    });
  });

  it('returns empty object when no calendar row exists', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    const { GET } = await import('@/app/api/data/calendar/route');
    const res = await GET();
    expect(await res.json()).toEqual({});
  });

  it('persists calendar payload via upsert', async () => {
    mockDb.execute.mockResolvedValue({ rows: [] });
    const body = {
      name: 'Updated',
      showIntercalarySeparately: false,
      current: { day: 1, month: 2, year: 3 },
      static: {},
      events: [],
      categories: [],
    };
    const { PUT } = await import('@/app/api/data/calendar/route');
    const res = await PUT(jsonRequest('http://test/api/calendar', 'PUT', body) as any);
    expect(mockDb.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ sql: expect.stringContaining('INSERT INTO calendar') })
    );
    expect(await res.json()).toEqual({ success: true, data: body });
  });
});
