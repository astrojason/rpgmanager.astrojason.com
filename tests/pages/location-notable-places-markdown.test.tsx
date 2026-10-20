import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAuthFetch = vi.fn();

vi.mock('@/utils/authFetch', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: 'main' }),
}));

vi.mock('@/utils/role', () => ({
  useIsDM: () => false,
}));

vi.mock('@/utils/adminCheck', () => ({
  useIsAdmin: () => false,
}));

vi.mock('@/utils/referrerTracking', () => ({
  useReferrerInfo: () => ({ label: 'Locations', url: '/campaign/locations' }),
  usePageTracking: () => {},
}));

describe('Location detail Notable Places', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/data/locations')) {
        return {
          ok: true,
          json: async () => [
            {
              id: 'main',
              name: 'Main City',
              teaser: 'A big city.',
              detail: '',
              locations: [
                { id: 'sub1', name: 'The Docks', teaser: 'A **busy** harbour with *salty* air.', detail: '' },
              ],
            },
          ],
        };
      }
      if (url.includes('/api/data/session-recaps')) return { ok: true, json: async () => [] };
      throw new Error(`Unexpected fetch ${url}`);
    });
  });

  it('renders markdown in a notable place teaser', async () => {
    const { default: LocationDetailPage } = await import('@/app/campaign/locations/[id]/page');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
    const { container } = render(<QueryClientProvider client={client}><LocationDetailPage /></QueryClientProvider>);

    await waitFor(() => expect(screen.getByText('The Docks')).toBeInTheDocument());

    expect(screen.queryByText(/\*\*busy\*\*/)).toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('busy');
    expect(container.querySelector('em')?.textContent).toBe('salty');
  });
});
