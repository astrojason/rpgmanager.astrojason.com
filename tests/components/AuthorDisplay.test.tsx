import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import AuthorDisplay from '@/components/AuthorDisplay';

const mockGetDisplayNameForUID = vi.fn();
const mockUseEffectiveUserId = vi.fn();

vi.mock('@/utils/questUtils', () => ({
  getDisplayNameForUID: (uid: string) => mockGetDisplayNameForUID(uid),
}));

vi.mock('@/lib/useEffectiveUserId', () => ({
  useEffectiveUserId: () => mockUseEffectiveUserId(),
}));

describe('AuthorDisplay', () => {
  beforeEach(() => {
    mockGetDisplayNameForUID.mockResolvedValue('Alice');
    mockUseEffectiveUserId.mockReturnValue('impersonated-id');
  });

  it('shows loading then resolved display name', async () => {
    render(<AuthorDisplay uid="user-1" />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(mockGetDisplayNameForUID).toHaveBeenCalledWith('user-1');
  });

  it('uses impersonated user id when flag enabled', async () => {
    render(<AuthorDisplay uid="user-1" useImpersonation />);

    await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    expect(mockGetDisplayNameForUID).toHaveBeenCalledWith('impersonated-id');
  });
});
