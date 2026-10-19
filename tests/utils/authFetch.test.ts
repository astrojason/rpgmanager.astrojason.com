import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authFetch } from '@/utils/authFetch';
import { setViewAsPlayer } from '@/lib/viewAs';

const originalFetch = global.fetch;

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  setViewAsPlayer(false);
});

function sentHeaders(): Headers {
  const [, init] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
  return init.headers as Headers;
}

describe('authFetch view-as', () => {
  it('does not send x-view-as by default', async () => {
    await authFetch('/api/data/quests');
    expect(sentHeaders().get('x-view-as')).toBeNull();
  });

  it('sends x-view-as: player while viewing as a player', async () => {
    setViewAsPlayer(true);
    await authFetch('/api/data/quests');
    expect(sentHeaders().get('x-view-as')).toBe('player');
  });
});
