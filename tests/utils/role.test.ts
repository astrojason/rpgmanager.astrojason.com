import { act, renderHook, waitFor } from '@testing-library/react';

const mockOnAuthStateChanged = vi.fn();
const mockUseImpersonation = vi.fn();
const mockUseEffectiveUserId = vi.fn();

vi.mock('@/lib/ImpersonationContext', () => ({
  useImpersonation: (...args: unknown[]) => mockUseImpersonation(...args),
}));
vi.mock('@/lib/useEffectiveUserId', () => ({
  useEffectiveUserId: (...args: unknown[]) => mockUseEffectiveUserId(...args),
}));
vi.mock('@/firebase/client', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

describe('role utilities', () => {
  beforeEach(() => {
    mockUseImpersonation.mockReturnValue({ impersonatedUserId: undefined });
    mockUseEffectiveUserId.mockReturnValue(undefined);
    mockOnAuthStateChanged.mockReset();
  });

  it('returns role from token claims', async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
      cb({
        getIdTokenResult: async () => ({ claims: { role: 'admin' } }),
      });
      return () => {};
    });
    const { useUserRole, useIsDM } = await import('@/utils/role');

    const { result } = renderHook(() => useUserRole());
    await waitFor(() => expect(result.current).toBe('admin'));

    const { result: dm } = renderHook(() => useIsDM());
    await waitFor(() => expect(dm.current).toBe(true));
  });

  it('handles missing user and returns null role', async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
      cb(null);
      return () => {};
    });
    const { useUserRole } = await import('@/utils/role');

    const { result } = renderHook(() => useUserRole());
    await waitFor(() => expect(result.current).toBeNull());
  });

  it('reports player from useUserRole while viewing as a player, but keeps the real role', async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
      cb({ getIdTokenResult: async () => ({ claims: { role: 'admin' } }) });
      return () => {};
    });
    const { useUserRole, useIsDM, useRealUserRole } = await import('@/utils/role');
    const { setViewAsPlayer } = await import('@/lib/viewAs');

    const { result: real } = renderHook(() => useRealUserRole());
    await waitFor(() => expect(real.current).toBe('admin'));

    act(() => setViewAsPlayer(true));
    const { result: effective } = renderHook(() => useUserRole());
    const { result: dm } = renderHook(() => useIsDM());
    await waitFor(() => expect(effective.current).toBe('player'));
    expect(dm.current).toBe(false);
    expect(real.current).toBe('admin');

    act(() => setViewAsPlayer(false));
    await waitFor(() => expect(effective.current).toBe('admin'));
  });

  it('never elevates a player when view-as is on', async () => {
    mockOnAuthStateChanged.mockImplementation((_auth: unknown, cb: (user: unknown) => void) => {
      cb({ getIdTokenResult: async () => ({ claims: { role: 'player' } }) });
      return () => {};
    });
    const { useUserRole } = await import('@/utils/role');
    const { setViewAsPlayer } = await import('@/lib/viewAs');
    act(() => setViewAsPlayer(true));
    const { result } = renderHook(() => useUserRole());
    await waitFor(() => expect(result.current).toBe('player'));
    act(() => setViewAsPlayer(false));
  });
});
