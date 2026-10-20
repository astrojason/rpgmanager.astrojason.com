import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAuthFetch = vi.fn();
let mockId = 'loc-006';

vi.mock('@/utils/authFetch', () => ({ authFetch: (...args: unknown[]) => mockAuthFetch(...args) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: mockId }),
}));
vi.mock('@/utils/role', () => ({ useIsDM: () => false }));
vi.mock('@/utils/adminCheck', () => ({ useIsAdmin: () => false }));
vi.mock('@/utils/referrerTracking', () => ({
  useReferrerInfo: () => ({ label: 'Locations', url: '/campaign/locations' }),
  usePageTracking: () => {},
}));

const data = [{
  id: '1', name: 'Bounty', teaser: 'Root.', detail: '',
  locations: [{
    id: 'sandhaven', name: 'Sandhaven', teaser: 'City.', detail: '',
    locations: [
      { id: 'loc-006', name: 'Oasis Bazaar', teaser: 'The market.', detail: '' },
      { id: 'loc-010', name: 'The Old Brazier', teaser: '**Exterior:** An old coffee shop in the *Palm Grove* Ward.', detail: '' },
    ],
  }],
}];

async function renderPage() {
  const { default: Page } = await import('@/app/campaign/locations/[id]/page');
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><Page /></QueryClientProvider>);
}

describe('Location detail deep lookup', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/data/locations')) return { ok: true, json: async () => data };
      if (url.includes('/api/data/session-recaps')) return { ok: true, json: async () => [] };
      throw new Error(`Unexpected fetch ${url}`);
    });
  });

  it('opens a location nested two levels below the root row', async () => {
    mockId = 'loc-006';
    await renderPage();
    await waitFor(() => expect(screen.getAllByText('Oasis Bazaar').length).toBeGreaterThan(0));
    expect(screen.queryByText(/not found/i)).toBeNull();
  });

  it('shows the teaser without the Exterior label or literal asterisks, rendering markdown', async () => {
    mockId = 'loc-010';
    const { container } = await renderPage();
    await waitFor(() => expect(screen.getAllByText('The Old Brazier').length).toBeGreaterThan(0));
    expect(container.textContent).not.toMatch(/Exterior:/);
    expect(container.textContent).not.toContain('**');
    expect(container.textContent).not.toContain('*Palm');
    expect(container.querySelector('em')?.textContent).toBe('Palm Grove');
  });
});
