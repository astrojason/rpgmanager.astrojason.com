import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import ImpersonationToolbarWrapper from '@/components/ImpersonationToolbarWrapper';
import { ImpersonationContext } from '@/lib/ImpersonationContext';

const onAuthStateChangedMock = vi.fn();

vi.mock('@/firebase/client', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (...args: unknown[]) => onAuthStateChangedMock(...args),
}));

describe('ImpersonationToolbarWrapper', () => {
  const originalLocation = window.location;
  const setImpersonatedUserId = vi.fn();

  beforeEach(() => {
    onAuthStateChangedMock.mockReset();
    setImpersonatedUserId.mockReset();
    // Ensure localhost to allow render
    // @ts-expect-error override for test
    delete window.location;
    // @ts-expect-error override for test
    window.location = { hostname: 'localhost' };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  function renderWithContext(initialImp?: string) {
    return render(
      <ImpersonationContext.Provider value={{ impersonatedUserId: initialImp, setImpersonatedUserId }}>
        <ImpersonationToolbarWrapper />
      </ImpersonationContext.Provider>
    );
  }

  it('renders toolbar for admin and calls impersonation handlers', async () => {
    onAuthStateChangedMock.mockImplementation((_auth, cb) => {
      cb({
        uid: 'real-admin',
        getIdTokenResult: async () => ({ claims: { role: 'admin' } }),
      });
      return () => {};
    });

    renderWithContext('admin');

    await waitFor(() => expect(screen.getByText(/Admin Impersonation/)).toBeInTheDocument());

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'user1' } });
    expect(setImpersonatedUserId).toHaveBeenCalledWith('user1');

    fireEvent.click(screen.getByText(/Clear/));
    expect(setImpersonatedUserId).toHaveBeenCalledWith(undefined);
  });

  it('does not render when user is not admin', async () => {
    onAuthStateChangedMock.mockImplementation((_auth, cb) => {
      cb({
        uid: 'player',
        getIdTokenResult: async () => ({ claims: { role: 'player' } }),
      });
      return () => {};
    });

    const { container } = renderWithContext();

    await act(async () => {});
    expect(container.firstChild).toBeNull();
  });
});
