import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAuthFetch = vi.fn();
const mockUseIsAdmin = vi.fn(() => false);
const mockUseIsDM = vi.fn(() => false);

vi.mock('@/utils/authFetch', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/utils/adminCheck', () => ({
  useIsAdmin: () => mockUseIsAdmin(),
}));
vi.mock('@/utils/role', () => ({
  useIsDM: () => mockUseIsDM(),
}));
vi.mock('@/utils/referrerTracking', () => ({
  usePageTracking: () => {},
}));
vi.mock('@/lib/useEffectiveUserId', () => ({
  useEffectiveUserId: () => 'user1',
}));
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

const npc = (overrides: Record<string, unknown> = {}) => ({
  id: '1',
  name: 'True Name',
  display_name: 'The Stranger',
  aka: '',
  pronunciation: '',
  race: 'Human',
  gender: 'Male',
  location: '',
  status: 'Alive',
  factions: [],
  description: '',
  background: '',
  roleplaying_notes: 'Brooding',
  image: null,
  hidden: false,
  nameHidden: false,
  hide_name: false,
  notes: [],
  gm_notes: null,
  ...overrides,
});

function setupFetch(npcs: unknown[]) {
  mockAuthFetch.mockImplementation(async (url: string) => {
    if (url.includes('/api/data/npcs')) return { ok: true, json: async () => npcs };
    if (url.includes('/api/data/factions')) return { ok: true, json: async () => [] };
    if (url.includes('/api/data/pcs')) return { ok: true, json: async () => [] };
    return { ok: true, json: async () => [] };
  });
}

const createTestClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
});

function renderWithClient(ui: React.ReactElement) {
  return render(<QueryClientProvider client={createTestClient()}>{ui}</QueryClientProvider>);
}

describe('NPC list page DM visibility', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockUseIsAdmin.mockReturnValue(false);
    mockUseIsDM.mockReturnValue(false);
  });

  it('player does not see hidden NPCs', async () => {
    setupFetch([npc({ id: '1', name: 'Visible', hidden: false }), npc({ id: '2', name: 'Secret NPC', hidden: true })]);
    const { default: NPCsPage } = await import('@/app/campaign/npcs/page');
    renderWithClient(<NPCsPage />);
    await waitFor(() => expect(screen.getAllByText('Visible')[0]).toBeInTheDocument());
    expect(screen.queryByText('Secret NPC')).toBeNull();
  });

  it('DM sees hidden NPCs in the list', async () => {
    mockUseIsDM.mockReturnValue(true);
    setupFetch([npc({ id: '2', name: 'Secret NPC', hidden: true })]);
    const { default: NPCsPage } = await import('@/app/campaign/npcs/page');
    renderWithClient(<NPCsPage />);
    await waitFor(() => expect(screen.getAllByText('Secret NPC')[0]).toBeInTheDocument());
  });

  it('player sees display name for name-hidden NPCs', async () => {
    setupFetch([npc({ id: '3', nameHidden: true })]);
    const { default: NPCsPage } = await import('@/app/campaign/npcs/page');
    renderWithClient(<NPCsPage />);
    await waitFor(() => expect(screen.getAllByText('The Stranger')[0]).toBeInTheDocument());
    expect(screen.queryByText('True Name')).toBeNull();
  });

  it('DM sees real name for name-hidden NPCs in the list', async () => {
    mockUseIsDM.mockReturnValue(true);
    setupFetch([npc({ id: '3', nameHidden: true })]);
    const { default: NPCsPage } = await import('@/app/campaign/npcs/page');
    renderWithClient(<NPCsPage />);
    await waitFor(() => expect(screen.getAllByText('True Name')[0]).toBeInTheDocument());
    expect(screen.queryByText('The Stranger')).toBeNull();
  });

  it('admin add form uses "Roleplaying Notes" label not "Personality"', async () => {
    mockUseIsAdmin.mockReturnValue(true);
    setupFetch([]);
    const { default: NPCsPage } = await import('@/app/campaign/npcs/page');
    renderWithClient(<NPCsPage />);
    await waitFor(() => expect(screen.queryByText(/consulting/i)).toBeNull());
    fireEvent.click(screen.getByText('+ Inscribe New'));
    await waitFor(() => expect(screen.getByText('Roleplaying Notes')).toBeInTheDocument());
    expect(screen.queryByText(/^Personality$/)).toBeNull();
  });
});
