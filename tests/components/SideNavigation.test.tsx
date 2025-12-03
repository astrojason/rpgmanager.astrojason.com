import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import SideNavigation from '@/components/SideNavigation';

const mockUsePathname = vi.fn();
const mockUseIsAdmin = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock('@/utils/adminCheck', () => ({
  useIsAdmin: () => mockUseIsAdmin(),
}));

// Stub SignOutButton to avoid auth wiring
vi.mock('@/components/SignOutButton', () => ({
  __esModule: true,
  default: () => <button>Sign out</button>,
}));

describe('SideNavigation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/campaign');
    mockUseIsAdmin.mockReturnValue(false);
  });

  it('highlights active route and toggles collapse', () => {
    const { getByLabelText, container } = render(<SideNavigation />);

    expect(screen.getByRole('link', { name: /Campaign Home/i })).toHaveClass('bg-slate-600');

    const button = getByLabelText(/Collapse navigation/i);
    fireEvent.click(button);

    expect(container.firstChild).toHaveClass('w-16');
    expect(button).toHaveAttribute('aria-label', 'Expand navigation');
  });

  it('renders admin section only when admin', () => {
    mockUseIsAdmin.mockReturnValue(true);
    render(<SideNavigation />);

    expect(screen.getByRole('link', { name: /Admin/i })).toBeInTheDocument();
  });

  it('disables coming-soon items', () => {
    render(<SideNavigation />);

    expect(screen.getByTitle('Items - Coming Soon')).toBeDisabled();
  });
});
