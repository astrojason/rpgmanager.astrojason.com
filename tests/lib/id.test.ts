import { afterEach, describe, expect, it, vi } from 'vitest';

describe('genUUID', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('prefers native randomUUID when available', async () => {
    const randomUUID = vi.fn(() => 'native-uuid');
    vi.stubGlobal('crypto', { randomUUID } as any);
    const { genUUID } = await import('@/lib/id');

    expect(genUUID()).toBe('native-uuid');
    expect(randomUUID).toHaveBeenCalled();
  });

  it('falls back to generated v4 uuid shape when crypto is missing', async () => {
    vi.stubGlobal('crypto', undefined as any);
    const { genUUID } = await import('@/lib/id');

    const uuid = genUUID();

    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });
});
