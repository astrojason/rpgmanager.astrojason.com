import { afterEach, describe, expect, it } from 'vitest';

vi.mock('@/utils/role', () => ({ useUserRole: () => null }));
vi.mock('@/firebase/client', () => ({ auth: null }));

import { isUserAdmin } from '@/utils/adminCheck';

const originalWindow = global.window;
const originalLocalStorage = global.localStorage;

afterEach(() => {
  global.window = originalWindow;
  global.localStorage = originalLocalStorage;
});

describe('admin check utility', () => {
  it('returns false when running server-side', () => {
    delete (global as any).window;

    expect(isUserAdmin()).toBe(false);
  });

  it('reads admin flag from localStorage when available', () => {
    const storage = {
      getItem: (key: string) => (key === 'isFirebaseAdmin' ? 'true' : null),
    };
    global.window = { localStorage: storage } as unknown as typeof global.window;
    global.localStorage = storage as unknown as typeof global.localStorage;

    expect(isUserAdmin()).toBe(true);
  });

  it('returns false when flag is not set', () => {
    const storage = {
      getItem: () => null,
    };
    global.window = { localStorage: storage } as unknown as typeof global.window;
    global.localStorage = storage as unknown as typeof global.localStorage;

    expect(isUserAdmin()).toBe(false);
  });
});
