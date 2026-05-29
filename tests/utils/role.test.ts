import { renderHook, waitFor } from '@testing-library/react';

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
});
