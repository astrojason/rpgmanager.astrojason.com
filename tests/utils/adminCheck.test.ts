import { afterEach, describe, expect, it } from 'vitest';

vi.mock('@/utils/role', () => ({ useUserRole: () => null }));
vi.mock('@/firebase/client', () => ({ auth: null }));

import { isUserAdmin } from '@/utils/adminCheck';

const originalWindow = global.window;
const originalLocalStorage = global.localStorage;

afterEach(() => {
  // @ts-expect-error reset test overrides
  global.window = originalWindow;
  // @ts-expect-error reset test overrides
  global.localStorage = originalLocalStorage;
});

describe('admin check utility', () => {
  it('returns false when running server-side', () => {
    // @ts-expect-error allow deletion for test
    delete (global as any).window;

    expect(isUserAdmin()).toBe(false);
  });

  it('reads admin flag from localStorage when available', () => {
    const storage = {
      getItem: (key: string) => (key === 'isFirebaseAdmin' ? 'true' : null),
    };
    // @ts-expect-error provide window mock for test
    global.window = { localStorage: storage };
    // @ts-expect-error expose global localStorage like browsers do
    global.localStorage = storage as any;

    expect(isUserAdmin()).toBe(true);
  });

  it('returns false when flag is not set', () => {
    const storage = {
      getItem: () => null,
    };
    // @ts-expect-error provide window mock for test
    global.window = { localStorage: storage };
    // @ts-expect-error expose global localStorage like browsers do
    global.localStorage = storage as any;

    expect(isUserAdmin()).toBe(false);
  });
});
