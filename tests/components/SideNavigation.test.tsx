import { render, screen } from '@testing-library/react';
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

  it('highlights active route with is-active class', () => {
    render(<SideNavigation />);

    expect(screen.getByRole('link', { name: /Campaign Home/i })).toHaveClass('is-active');
  });

  it('renders admin section only when admin', () => {
    mockUseIsAdmin.mockReturnValue(true);
    render(<SideNavigation />);

    expect(screen.getByRole('link', { name: /Admin/i })).toBeInTheDocument();
  });

  it('renders coming-soon items as non-interactive spans with dim class', () => {
    render(<SideNavigation />);

    const el = screen.getByTitle('Items — coming soon');
    expect(el.tagName.toLowerCase()).toBe('span');
    expect(el).toHaveClass('is-dim');
  });
});
