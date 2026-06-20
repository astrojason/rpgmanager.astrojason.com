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
  useSearchParams: () => ({ get: () => null }),
}));

vi.mock('@/utils/role', () => ({
  useIsDM: () => false,
}));

vi.mock('@/utils/referrerTracking', () => ({
  useReferrerInfo: () => ({ label: 'PCs', url: '/campaign/pcs' }),
  usePageTracking: () => {},
  getDefaultBackInfo: () => ({ label: 'PCs', url: '/campaign/pcs' }),
}));

describe('PCsPage null handling', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/data/pcs')) {
        return {
          ok: true,
          json: async () => [
            {
              id: '1',
              name: 'Nullmage',
              race: null,
              hometown: null,
              status: 'Active',
              class: '',
              image: 'null',
              gif: null,
              factions: [],
            },
          ],
        };
      }
      if (url.includes('/api/data/factions')) {
        return { ok: true, json: async () => [] };
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
  });

  it('renders placeholder instead of string "null" values and missing images', async () => {
    const { default: PCsPage } = await import('@/app/campaign/pcs/page');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
    const { container } = render(<QueryClientProvider client={client}><PCsPage /></QueryClientProvider>);

    await waitFor(() => expect(screen.getAllByText('Nullmage')[0]).toBeInTheDocument());

    // Missing/invalid image should fall back to placeholder slot (no <img> alt)
    expect(screen.queryByAltText('Nullmage')).toBeNull();
    expect(container.querySelector('.grim-img-slot')).toBeInTheDocument();

    // Ensure literal "null" never surfaces
    expect(screen.queryByText(/\bnull\b/i)).toBeNull();
  });
});
