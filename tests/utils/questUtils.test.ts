import { afterEach, describe, expect, it, vi } from 'vitest';

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
});

describe('quest utils', () => {
  it('returns DM display name for known UID', async () => {
    const { getDisplayNameForUID, clearPcsCache } = await import('@/utils/questUtils');
    clearPcsCache();

    const name = await getDisplayNameForUID('75jk9LhhIfhqYkqV3cHsLr3ONeb2');

    expect(name).toBe('DM');
  });

  it('returns legacy identifiers without lookup', async () => {
    const { getDisplayNameForUID, clearPcsCache } = await import('@/utils/questUtils');
    clearPcsCache();

    await expect(getDisplayNameForUID('player@example.com')).resolves.toBe('player@example.com');
    await expect(getDisplayNameForUID('Admin')).resolves.toBe('Admin');
  });

  it('loads and caches PCs to resolve player names', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => [{ id: '1', name: 'Alaric', player: 'user-1' }],
    })) as any;
    global.fetch = fetchMock;

    const { getDisplayNameForUID, clearPcsCache } = await import('@/utils/questUtils');
    clearPcsCache();

    const first = await getDisplayNameForUID('user-1');
    const second = await getDisplayNameForUID('user-1');

    expect(first).toBe('Alaric');
    expect(second).toBe('Alaric');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to Unknown when cache is empty', async () => {
    const { getDisplayNameSync, clearPcsCache } = await import('@/utils/questUtils');
    clearPcsCache();

    expect(getDisplayNameSync('missing')).toBe('Unknown');
  });

  it('normalizes quest notes from legacy strings', async () => {
    const { normalizeQuestNotes } = await import('@/utils/questUtils');
    const quest = { id: 'q1', notes: ['old note'] } as any;

    const normalized = normalizeQuestNotes(quest);

    expect(normalized).toEqual([
      { id: 'legacy-q1-0', content: 'old note', timestamp: '', author: 'Unknown' },
    ]);
  });

  it('passes through already-normalized notes', async () => {
    const { normalizeQuestNotes } = await import('@/utils/questUtils');
    const note = { id: 'note-1', content: 'hi', timestamp: '2024-01-01', author: 'me' };
    const quest = { id: 'q2', notes: [note] } as any;

    expect(normalizeQuestNotes(quest)).toEqual([note]);
  });

  it('detects legacy notes and formats timestamps defensively', async () => {
    const { isLegacyNote, formatNoteTimestamp } = await import('@/utils/questUtils');

    expect(isLegacyNote({ id: '1', content: 'hi', timestamp: '' } as any)).toBe(true);
    expect(formatNoteTimestamp({ timestamp: undefined } as any)).toBe('');

    const formatted = formatNoteTimestamp({ timestamp: '2025-01-02T00:00:00Z' } as any);
    expect(formatted).toContain('2025');
  });

  it('migrates quest notes to new format', async () => {
    const { migrateQuestToNewFormat } = await import('@/utils/questUtils');
    const quest = { id: 'q3', notes: ['legacy'] } as any;

    const migrated = migrateQuestToNewFormat(quest);

    expect(Array.isArray(migrated.notes)).toBe(true);
    expect(migrated.notes[0].id).toBe('legacy-q3-0');
  });
});
