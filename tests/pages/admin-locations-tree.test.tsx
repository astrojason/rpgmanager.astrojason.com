import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAuthFetch = vi.fn();
vi.mock('@/utils/authFetch', () => ({ authFetch: (...args: unknown[]) => mockAuthFetch(...args) }));

const data = [{
  id: '1', name: 'Bounty', teaser: 'Root.', detail: 'x',
  locations: [{ id: 'sand', name: 'Sandhaven', teaser: 'City.', detail: '',
    locations: [{ id: 'loc-007', name: 'Palm Grove Ward', teaser: '**Exterior:** Old district.', detail: '' }] }],
}];

describe('Admin locations tree', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockAuthFetch.mockImplementation(async () => ({ ok: true, json: async () => data }));
  });

  it('lists nested locations, searches every level, and marks nested rows read-only', async () => {
    const { default: Page } = await import('@/app/admin/data/locations/page');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
    render(<QueryClientProvider client={client}><Page /></QueryClientProvider>);

    await waitFor(() => expect(screen.getByText('Palm Grove Ward')).toBeInTheDocument());
    expect(screen.getByText('Sandhaven')).toBeInTheDocument();
    expect(screen.queryByText(/Exterior:/)).toBeNull();

    fireEvent.change(screen.getByPlaceholderText('Search locations…'), { target: { value: 'palm' } });
    expect(screen.getByText('Palm Grove Ward')).toBeInTheDocument();
    expect(screen.queryByText('Sandhaven')).toBeNull();
    expect(screen.getAllByText('vault').length).toBe(1);
  });
});
