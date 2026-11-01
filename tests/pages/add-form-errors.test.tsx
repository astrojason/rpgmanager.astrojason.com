import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAuthFetch = vi.fn();

vi.mock('@/utils/authFetch', () => ({ authFetch: (...a: unknown[]) => mockAuthFetch(...a) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/utils/adminCheck', () => ({ useIsAdmin: () => true }));
vi.mock('@/utils/role', () => ({ useIsDM: () => true }));
vi.mock('@/utils/referrerTracking', () => ({ usePageTracking: () => {} }));
vi.mock('@/lib/useEffectiveUserId', () => ({ useEffectiveUserId: () => 'user1' }));
vi.mock('@/components/MarkdownEditor', () => ({ default: () => null }));
vi.mock('@/components/UserNotesEditor', () => ({ default: () => null }));

function setup() {
  mockAuthFetch.mockImplementation(async (url: string, opts?: { method?: string }) => {
    if (opts?.method === 'POST') return { ok: false, status: 500, statusText: 'Server Error', text: async () => 'db exploded' };
    return { ok: true, json: async () => [] };
  });
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => { mockAuthFetch.mockReset(); setup(); });

describe('add forms surface failures', () => {
  it('NPC add shows the server error in a copyable block', async () => {
    const { default: Page } = await import('@/app/campaign/npcs/page');
    wrap(<Page />);
    fireEvent.click(await screen.findByText(/Inscribe/i, { selector: 'button' }));
    fireEvent.submit(document.querySelector('form')!);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('db exploded');
  });

  it('Item add shows the server error in a copyable block', async () => {
    const { default: Page } = await import('@/app/campaign/items/page');
    wrap(<Page />);
    fireEvent.click(await screen.findByText(/Catalogue/i, { selector: 'button' }));
    fireEvent.submit(document.querySelector('form')!);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('db exploded');
  });
});
