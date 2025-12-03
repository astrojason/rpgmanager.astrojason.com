import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDb } from '../test-utils';

// Local helper to work with an unmocked schema module while still stubbing getDb
beforeEach(() => {
  vi.resetModules();
});

describe('ensureSchema', () => {
  it('enables foreign keys and creates expected tables', async () => {
    vi.doMock('@/lib/turso', () => ({ getDb: () => mockDb }));
    vi.doUnmock('@/lib/schema');
    const { ensureSchema } = await import('@/lib/schema');

    await ensureSchema();

    const calls = mockDb.execute.mock.calls.map((c) => c[0] as string);
    expect(calls[0]).toContain('PRAGMA foreign_keys = ON');
    expect(calls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS factions'))).toBe(true);
    expect(calls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS npcs'))).toBe(true);
    expect(calls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS pcs'))).toBe(true);
    expect(calls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS locations'))).toBe(true);
    expect(calls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS quests'))).toBe(true);
    expect(calls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS timeline'))).toBe(true);
    expect(calls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS session_recaps'))).toBe(true);
    expect(calls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS calendar'))).toBe(true);
    expect(calls.some((sql) => sql.includes('CREATE TABLE IF NOT EXISTS next_session'))).toBe(true);
  });
});
