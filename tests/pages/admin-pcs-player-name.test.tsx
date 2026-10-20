import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAuthFetch = vi.fn();
let resolveUsers: (v: unknown) => void;

vi.mock('@/utils/authFetch', () => ({ authFetch: (...args: unknown[]) => mockAuthFetch(...args) }));
vi.mock('firebase/functions', () => ({
  getFunctions: () => ({}),
  httpsCallable: () => () => new Promise(res => { resolveUsers = res; }),
}));

describe('Admin PCs player names', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockAuthFetch.mockImplementation(async (url: string) => {
      if (url.includes('/api/data/pcs')) {
        return { ok: true, json: async () => [{ id: '2', name: 'Oogway', race: 'Tortle', hometown: 'Bay', class: 'Monk', player: 'uid-pam' }] };
      }
      return { ok: true, json: async () => [] };
    });
  });

  it('shows a loading label, then the player display name, never "Unknown Player" for a known user', async () => {
    const { default: Page } = await import('@/app/admin/data/pcs/page');
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
    render(<QueryClientProvider client={client}><Page /></QueryClientProvider>);

    await waitFor(() => expect(screen.getByText('Oogway')).toBeInTheDocument());
    expect(screen.queryByText(/Unknown Player/)).toBeNull();

    resolveUsers({ data: [{ uid: 'uid-pam', email: 'p@x.com', displayName: 'Pamela' }] });
    await waitFor(() => expect(screen.getByText(/Pamela/)).toBeInTheDocument());
    expect(screen.queryByText(/Unknown Player/)).toBeNull();
  });
});
