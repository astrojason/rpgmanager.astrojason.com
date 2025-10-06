import { describe, expect, it } from 'vitest';
import { jsonRequest, mockDb } from '../test-utils';

describe('next-session endpoint', () => {
  it('returns session data with parsed reminders', async () => {
    mockDb.execute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [
          {
            date: '2025-09-15',
            agenda: 'Plan',
            reminders: JSON.stringify(['bring dice']),
            currentGameDate: 'Day 1',
            lastUpdated: '2025-09-08',
            isSkipped: 1,
            skipReason: 'vacation',
          },
        ],
      });
    const { GET } = await import('@/app/api/data/next-session/route');
    const res = await GET();
    expect(await res.json()).toEqual({
      date: '2025-09-15',
      agenda: 'Plan',
      reminders: ['bring dice'],
      currentGameDate: 'Day 1',
      location: undefined,
      notes: undefined,
      lastUpdated: '2025-09-08',
      isSkipped: true,
      skipReason: 'vacation',
    });
  });

  it('upserts session payload', async () => {
    mockDb.execute.mockResolvedValue({ rows: [] });
    const body = {
      date: '2025-09-22',
      reminders: ['rest'],
      isSkipped: false,
    };
    const { PUT } = await import('@/app/api/data/next-session/route');
    const res = await PUT(jsonRequest('http://test/api/next-session', 'PUT', body) as any);
    expect(mockDb.execute).toHaveBeenLastCalledWith(
      expect.objectContaining({ sql: expect.stringContaining('INSERT INTO next_session') })
    );
    expect(await res.json()).toEqual({ success: true, data: body });
  });
});
