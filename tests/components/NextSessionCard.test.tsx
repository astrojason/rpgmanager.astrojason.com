import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NextSessionCard from '@/components/NextSessionCard';

const useIsAdminMock = vi.fn();

vi.mock('@/utils/adminCheck', () => ({
  useIsAdmin: () => useIsAdminMock(),
}));

const createTestClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
});

function renderWithClient(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createTestClient()}>{ui}</QueryClientProvider>
  );
}

describe('NextSessionCard', () => {
  const originalFetch = global.fetch;
  const originalPrompt = global.prompt;

  beforeEach(() => {
    useIsAdminMock.mockReturnValue(false);
    global.fetch = vi.fn();
    global.prompt = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.prompt = originalPrompt;
  });

  it('shows unavailable state when fetch fails', async () => {
    (global.fetch as any).mockResolvedValueOnce({ ok: false });

    renderWithClient(<NextSessionCard />);

    await waitFor(() => {
      expect(screen.getByText(/Session Data Unavailable/)).toBeInTheDocument();
    });
  });

  it('renders upcoming session details and allows skipping for admin', async () => {
    useIsAdminMock.mockReturnValue(true);
    const sessionBase = {
      date: '2035-01-01',
      agenda: 'Quest planning',
      reminders: ['bring snacks'],
      currentGameDate: 'Day 10',
    };
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...sessionBase, isSkipped: false }) }) // initial GET
      .mockResolvedValueOnce({ ok: true }) // PUT
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...sessionBase, isSkipped: true, skipReason: 'busy' }) }); // refetch GET
    (global.prompt as any).mockReturnValue('busy');

    renderWithClient(<NextSessionCard />);

    await waitFor(() => expect(screen.getByText(/Next Session/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Skip/ }));

    await waitFor(() => expect(screen.getByText(/Session Skipped/)).toBeInTheDocument());
    expect(global.fetch).toHaveBeenCalledWith('/api/data/next-session', expect.objectContaining({ method: 'PUT' }));
  });

  it('resumes session when already skipped', async () => {
    useIsAdminMock.mockReturnValue(true);
    const sessionBase = {
      date: '2035-01-01',
      agenda: 'Quest planning',
      reminders: ['bring snacks'],
      currentGameDate: 'Day 10',
    };
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...sessionBase, isSkipped: true, skipReason: 'weather' }) }) // initial GET
      .mockResolvedValueOnce({ ok: true }) // PUT
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...sessionBase, isSkipped: false, skipReason: '' }) }); // refetch GET

    renderWithClient(<NextSessionCard />);

    await waitFor(() => expect(screen.getByText(/Session Skipped/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Resume/));

    await waitFor(() => expect(screen.getByText(/Next Session/)).toBeInTheDocument());
  });
});
