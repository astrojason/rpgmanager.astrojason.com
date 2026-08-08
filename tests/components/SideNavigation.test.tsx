import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe('SideNavigation', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/campaign');
    mockUseIsAdmin.mockReturnValue(false);
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => null });
  });

  it('highlights active route with is-active class', () => {
    renderWithQueryClient(<SideNavigation />);

    expect(screen.getByRole('link', { name: /Campaign Home/i })).toHaveClass('is-active');
  });

  it('renders admin section only when admin', () => {
    mockUseIsAdmin.mockReturnValue(true);
    renderWithQueryClient(<SideNavigation />);

    expect(screen.getByRole('link', { name: /Admin/i })).toBeInTheDocument();
  });

  it('renders coming-soon items as non-interactive spans with dim class', () => {
    renderWithQueryClient(<SideNavigation />);

    const el = screen.getByTitle(/^Lore/);
    expect(el.tagName.toLowerCase()).toBe('span');
    expect(el).toHaveClass('is-dim');
  });
});
