import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockAuthFetch = vi.fn();

vi.mock('@/utils/authFetch', () => ({ authFetch: (...a: unknown[]) => mockAuthFetch(...a) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({ id: '2' }),
}));
vi.mock('@/firebase/client', () => ({ auth: null }));
vi.mock('@/utils/adminCheck', () => ({ useIsAdmin: () => true }));
vi.mock('@/utils/role', () => ({ useIsDM: () => true }));
vi.mock('@/lib/useEffectiveUserId', () => ({ useEffectiveUserId: () => 'user1' }));
vi.mock('@/components/MarkdownEditor', () => ({ default: () => null }));
vi.mock('@/components/UserNotesEditor', () => ({ default: () => null }));
vi.mock('@/components/EntityTagPicker', () => ({ default: () => null }));

const quest = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id, name, notes: [], status: 'active', gm_notes: '',
  tagged_npcs: [], tagged_locations: [], tagged_factions: [], tagged_deities: [],
  parent_id: null, parent_hidden: false, ...extra,
});

// 1 Parent Quest  <-  2 Middle Quest  <-  3 Leaf Quest ;  4 Other Quest
const quests = [
  quest('1', 'Parent Quest'),
  quest('2', 'Middle Quest', { parent_id: '1' }),
  quest('3', 'Leaf Quest', { parent_id: '2' }),
  quest('4', 'Other Quest'),
];

function setupFetch(data: unknown[] = quests) {
  mockAuthFetch.mockImplementation(async (url?: string) => {
    if (String(url ?? '').includes('/api/data/quests')) return { ok: true, json: async () => data };
    return { ok: true, json: async () => [] };
  });
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('quest detail page: hierarchy', () => {
  beforeEach(() => mockAuthFetch.mockReset());

  it('links to the parent quest and lists sub-quests', async () => {
    setupFetch();
    const { default: Page } = await import('@/app/campaign/quests/[id]/page');
    wrap(<Page />);
    const parent = await screen.findByRole('link', { name: 'Parent Quest' });
    expect(parent).toHaveAttribute('href', '/campaign/quests/1');
    const child = await screen.findByRole('link', { name: /Leaf Quest/ });
    expect(child).toHaveAttribute('href', '/campaign/quests/3');
  });

  it('shows no parent or sub-quest sections for an unrelated quest', async () => {
    setupFetch([quest('2', 'Middle Quest')]);
    const { default: Page } = await import('@/app/campaign/quests/[id]/page');
    wrap(<Page />);
    await screen.findByText('Middle Quest');
    expect(screen.queryByText(/part of/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/sub-quests/i)).not.toBeInTheDocument();
  });

  it('tells a GM when the parent link is hidden from players', async () => {
    setupFetch([quest('1', 'Parent Quest'), quest('2', 'Middle Quest', { parent_id: '1', parent_hidden: true })]);
    const { default: Page } = await import('@/app/campaign/quests/[id]/page');
    wrap(<Page />);
    await screen.findByRole('link', { name: 'Parent Quest' });
    expect(screen.getByText(/hidden from players/i)).toBeInTheDocument();
  });
});

describe('admin quests form: parent quest', () => {
  beforeEach(() => mockAuthFetch.mockReset());

  async function openNewQuestForm() {
    const { default: Page } = await import('@/app/admin/data/quests/page');
    wrap(<Page />);
    const buttons = await screen.findAllByRole('button');
    fireEvent.click(buttons.find(b => /new|add|create|inscribe/i.test(b.textContent ?? ''))!);
    await screen.findByText('GM Notes');
  }

  it('offers other quests as parents and hides the link checkbox until one is chosen', async () => {
    setupFetch();
    await openNewQuestForm();
    const select = (await screen.findByLabelText(/parent quest/i)) as HTMLSelectElement;
    const options = Array.from(select.options).map(o => o.textContent);
    expect(options).toEqual(expect.arrayContaining(['None (top-level quest)', 'Parent Quest', 'Other Quest']));
    expect(screen.queryByLabelText(/hide parent link from players/i)).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: '4' } });
    const checkbox = (await screen.findByLabelText(/hide parent link from players/i)) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });
});
