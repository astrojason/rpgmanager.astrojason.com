import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockAuthFetch = vi.fn();
const mockUseIsAdmin = vi.fn(() => true);
const mockUseIsDM = vi.fn(() => false);
const mockPush = vi.fn();

vi.mock('@/utils/authFetch', () => ({
  authFetch: (...args: unknown[]) => mockAuthFetch(...args),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: '1' }),
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
  default: ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) =>
    React.createElement('textarea', {
      'data-testid': `md-${label}`,
      value: value || '',
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value),
    }),
}));
vi.mock('@/components/UserNotesEditor', () => ({
  default: () => null,
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement('img', { src, alt }),
}));

const makeNpc = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  display_name: '',
  aka: '',
  pronunciation: '',
  race: 'Human',
  gender: 'Male',
  location: 'Somewhere',
  status: 'Alive',
  factions: [],
  description: '',
  background: '',
  roleplaying_notes: '',
  gm_notes: null,
  image: null,
  hidden: false,
  nameHidden: false,
  hide_name: false,
  notes: [],
  linked_npcs: [],
  ...extra,
});

const allNpcs = [
  makeNpc('1', 'Aldric'),
  makeNpc('2', 'Zara'),
  makeNpc('3', 'Marcus'),
  makeNpc('4', 'Beatrix'),
];

function setupFetch() {
  mockAuthFetch.mockImplementation(async (url: string) => {
    if (url.includes('/api/data/npcs')) return { ok: true, json: async () => allNpcs };
    if (url.includes('/api/data/factions')) return { ok: true, json: async () => [] };
    if (url.includes('/api/data/session-recaps')) return { ok: true, json: async () => [] };
    if (url.includes('/api/data/deities')) return { ok: true, json: async () => [] };
    if (url.includes('/api/data/pcs')) return { ok: true, json: async () => [] };
    if (url.includes('/api/data/locations')) return { ok: true, json: async () => [] };
    if (url.includes('/api/data/items')) return { ok: true, json: async () => [] };
    return { ok: true, json: async () => [] };
  });
}

describe('NPC detail page — linked NPC list', () => {
  beforeEach(() => {
    mockAuthFetch.mockReset();
    mockUseIsAdmin.mockReturnValue(true);
    mockUseIsDM.mockReturnValue(false);
    setupFetch();
  });

  async function openEditForm() {
    const { default: NPCDetailPage } = await import('@/app/campaign/npcs/[id]/page');
    render(<NPCDetailPage />);
    await waitFor(() => expect(screen.getByText('Aldric')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Edit'));
    await waitFor(() => expect(screen.getByText('Linked NPCs')).toBeInTheDocument());
  }

  it('linked NPC list is alphabetically sorted', async () => {
    await openEditForm();

    const checkboxLabels = screen.getAllByRole('checkbox')
      .map(cb => cb.closest('label'))
      .filter((el): el is HTMLLabelElement => el !== null)
      .filter(el => ['Zara', 'Marcus', 'Beatrix'].some(n => el.textContent?.includes(n)))
      .map(el => el.textContent?.trim());

    expect(checkboxLabels).toEqual(['Beatrix', 'Marcus', 'Zara']);
  });

  it('linked NPC list can be filtered by name', async () => {
    await openEditForm();

    const filterInput = screen.getByPlaceholderText(/filter/i);
    fireEvent.change(filterInput, { target: { value: 'mar' } });

    expect(screen.getByLabelText('Marcus')).toBeInTheDocument();
    expect(screen.queryByLabelText('Zara')).toBeNull();
    expect(screen.queryByLabelText('Beatrix')).toBeNull();
  });

  it('filter input is cleared and list restored when input is emptied', async () => {
    await openEditForm();

    const filterInput = screen.getByPlaceholderText(/filter/i);
    fireEvent.change(filterInput, { target: { value: 'zar' } });
    expect(screen.getByLabelText('Zara')).toBeInTheDocument();
    expect(screen.queryByLabelText('Beatrix')).toBeNull();

    fireEvent.change(filterInput, { target: { value: '' } });
    expect(screen.getByLabelText('Beatrix')).toBeInTheDocument();
    expect(screen.getByLabelText('Zara')).toBeInTheDocument();
  });
});
