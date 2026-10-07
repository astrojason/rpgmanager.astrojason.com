import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAuthFetch = vi.fn();

vi.mock('@/utils/authFetch', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/firebase/client', () => ({ auth: null }));
vi.mock('@/components/MarkdownEditor', () => ({
  default: ({ value, onChange, label }: any) =>
    React.createElement('textarea', {
      'data-testid': `md-${label}`,
      value: value || '',
      onChange: (e: any) => onChange(e.target.value),
    }),
}));
vi.mock('@/components/UserNotesEditor', () => ({
  default: () => null,
}));
vi.mock('@/components/EntityTagPicker', () => ({
  default: () => null,
}));

const quest = (overrides: Record<string, unknown> = {}) => ({
  id: '1',
  name: 'Secret Quest',
  notes: [],
  status: 'active',
  hidden: true,
  gm_notes: '',
  tagged_npcs: [],
  tagged_locations: [],
  tagged_factions: [],
  tagged_deities: [],
  ...overrides,
});

function setupFetch(quests: unknown[]) {
  mockAuthFetch.mockImplementation(async (url: string) => {
    if (url.includes('/api/data/quests')) return { ok: true, json: async () => quests };
    return { ok: true, json: async () => [] };
  });
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('admin quests page hidden flag', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
  });

  it('marks hidden quests in the list', async () => {
    setupFetch([quest()]);
    const { default: Page } = await import('@/app/admin/data/quests/page');
    renderWithClient(<Page />);
    await waitFor(() => expect(screen.getAllByText('Secret Quest')[0]).toBeInTheDocument());
    expect(screen.getAllByText('hidden').length).toBeGreaterThan(0);
  });

  it('offers a "Hidden from players" checkbox when creating a quest', async () => {
    setupFetch([]);
    const { default: Page } = await import('@/app/admin/data/quests/page');
    renderWithClient(<Page />);
    const addButtons = await screen.findAllByRole('button');
    const create = addButtons.find(b => /new|add|create|inscribe/i.test(b.textContent ?? ''));
    expect(create).toBeDefined();
    fireEvent.click(create!);
    const checkbox = await screen.findByLabelText(/hidden from players/i);
    expect((checkbox as HTMLInputElement).checked).toBe(false);
    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(true);
  });
});
