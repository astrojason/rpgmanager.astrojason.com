import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  process.env.TURSO_DATABASE_URL = originalEnv.TURSO_DATABASE_URL;
  process.env.TURSO_AUTH_TOKEN = originalEnv.TURSO_AUTH_TOKEN;
});

describe('turso client helpers', () => {
  it('throws when database url is missing', async () => {
    vi.doUnmock('@/lib/turso');
    const createClient = vi.fn();
    vi.doMock('@libsql/client', () => ({ createClient }));
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.TURSO_AUTH_TOKEN;

    const { getDb } = await import('@/lib/turso');

    expect(() => getDb()).toThrow('TURSO_DATABASE_URL is not set');
  });

  it('caches created client instance', async () => {
    vi.doUnmock('@/lib/turso');
    const client = { execute: vi.fn() };
    const createClient = vi.fn(() => client as any);
    vi.doMock('@libsql/client', () => ({ createClient }));
    process.env.TURSO_DATABASE_URL = 'http://example.db';
    process.env.TURSO_AUTH_TOKEN = 'token';

    const { getDb } = await import('@/lib/turso');
    const first = getDb();
    const second = getDb();

    expect(first).toBe(client);
    expect(second).toBe(client);
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it('creates JSON table with provided name', async () => {
    vi.doUnmock('@/lib/turso');
    const execute = vi.fn();
    const createClient = vi.fn(() => ({ execute }) as any);
    vi.doMock('@libsql/client', () => ({ createClient }));
    process.env.TURSO_DATABASE_URL = 'http://example.db';
    process.env.TURSO_AUTH_TOKEN = 'token';

    const { ensureTable } = await import('@/lib/turso');
    await ensureTable('events');

    expect(execute).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS events'));
  });
});
