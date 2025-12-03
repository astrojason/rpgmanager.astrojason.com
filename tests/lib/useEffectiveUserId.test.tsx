import { renderHook, waitFor } from '@testing-library/react';

const mockUseImpersonation = vi.fn();
const mockOnAuthStateChanged = vi.fn();

vi.mock('@/lib/ImpersonationContext', () => ({
  useImpersonation: (...args: unknown[]) => mockUseImpersonation(...args),
}));

vi.mock('@/firebase/client', () => ({
  auth: {},
}));

vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => mockOnAuthStateChanged(...args),
}));

describe('useEffectiveUserId', () => {
  beforeEach(() => {
    mockUseImpersonation.mockReset();
    mockOnAuthStateChanged.mockReset();
    mockOnAuthStateChanged.mockReturnValue(() => {});
  });

  it('returns impersonated user id when provided', async () => {
    mockUseImpersonation.mockReturnValue({ impersonatedUserId: 'imp', setImpersonatedUserId: vi.fn() });
    const { useEffectiveUserId } = await import('@/lib/useEffectiveUserId');

    const { result } = renderHook(() => useEffectiveUserId());

    expect(result.current).toBe('imp');
  });

  it('falls back to real user id from auth listener when not impersonating', async () => {
    mockUseImpersonation.mockReturnValue({ impersonatedUserId: undefined, setImpersonatedUserId: vi.fn() });
    mockOnAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: 'real-user' });
      return () => {};
    });
    const { useEffectiveUserId } = await import('@/lib/useEffectiveUserId');

    const { result } = renderHook(() => useEffectiveUserId());

    await waitFor(() => expect(result.current).toBe('real-user'));
  });
});
