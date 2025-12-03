import { describe, expect, it, vi, beforeEach } from 'vitest';

const getUserMock = vi.fn();
const setCustomUserClaimsMock = vi.fn();
const listUsersMock = vi.fn();

vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  auth: () => ({
    getUser: getUserMock,
    setCustomUserClaims: setCustomUserClaimsMock,
    listUsers: listUsersMock,
  }),
}), { virtual: true });

class HttpsError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

vi.mock('firebase-functions/v2/https', () => ({
  onCall: (fn: any) => fn,
  HttpsError,
}), { virtual: true });

vi.mock('firebase-functions', () => ({
  setGlobalOptions: vi.fn(),
}), { virtual: true });

vi.mock('firebase-functions/logger', () => ({
  log: vi.fn(),
  error: vi.fn(),
}), { virtual: true });

describe('cloud functions', () => {
  beforeEach(() => {
    getUserMock.mockReset();
    setCustomUserClaimsMock.mockReset();
    listUsersMock.mockReset();
    process.env.FIREBASE_CONFIG = JSON.stringify({ projectId: 'test' });
    (globalThis as any).__adminAuthMock = {
      getUser: getUserMock,
      setCustomUserClaims: setCustomUserClaimsMock,
      listUsers: listUsersMock,
    };
  });

  it('assigns player role when none exists', async () => {
    getUserMock.mockResolvedValueOnce({ customClaims: undefined });
    const { assignPlayerRoleHandler } = await import('../../functions/src/index');

    const res = await assignPlayerRoleHandler({ auth: { uid: 'u1', token: {} } } as any);

    expect(setCustomUserClaimsMock).toHaveBeenCalledWith('u1', { role: 'player' });
    expect(res).toMatchObject({ message: 'Player role assigned successfully' });
  });

  it('returns existing role instead of reassigning', async () => {
    getUserMock.mockResolvedValueOnce({ customClaims: { role: 'admin' } });
    const { assignPlayerRoleHandler } = await import('../../functions/src/index');

    const res = await assignPlayerRoleHandler({ auth: { uid: 'u1', token: {} } } as any);

    expect(setCustomUserClaimsMock).not.toHaveBeenCalled();
    expect(res.message).toContain('already has role');
  });

  it('throws when caller not admin in setUserRole', async () => {
    const { setUserRoleHandler } = await import('../../functions/src/index');
    await expect(
      setUserRoleHandler({ auth: { token: { role: 'player' } }, data: { uid: 'x', role: 'dm' } } as any)
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('sets role when caller is admin', async () => {
    const { setUserRoleHandler } = await import('../../functions/src/index');

    await setUserRoleHandler({ auth: { token: { role: 'admin' }, uid: 'admin-1' }, data: { uid: 'u2', role: 'dm' } } as any);

    expect(setCustomUserClaimsMock).toHaveBeenCalledWith('u2', { role: 'dm' });
  });

  it('rejects invalid role value', async () => {
    const { setUserRoleHandler } = await import('../../functions/src/index');
    await expect(
      setUserRoleHandler({ auth: { token: { role: 'admin' }, uid: 'admin-1' }, data: { uid: 'u2', role: 'bad' } } as any)
    ).rejects.toMatchObject({ code: 'invalid-argument' });
  });

  it('returns role information via checkMyRole', async () => {
    getUserMock.mockResolvedValueOnce({ customClaims: { role: 'dm' }, metadata: {} });
    const { checkMyRoleHandler } = await import('../../functions/src/index');

    const res = await checkMyRoleHandler({ auth: { uid: 'u1', token: { email: 'a@test.com', role: 'dm' } } } as any);

    expect(res).toMatchObject({ uid: 'u1', role: 'dm' });
  });

  it('lists users for admin only', async () => {
    listUsersMock.mockResolvedValueOnce({
      users: [
        { uid: 'u1', email: 'a@test.com', displayName: 'A', customClaims: { role: 'player' }, metadata: { lastSignInTime: '', creationTime: '' } },
      ],
    });
    const { listUsersHandler } = await import('../../functions/src/index');

    const res = await listUsersHandler({ auth: { token: { role: 'admin' }, uid: 'admin-1' } } as any);

    expect(res[0]).toMatchObject({ uid: 'u1', role: 'player' });
  });
});
