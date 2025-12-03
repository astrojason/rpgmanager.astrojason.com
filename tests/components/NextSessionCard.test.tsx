import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import NextSessionCard from '@/components/NextSessionCard';

const useIsAdminMock = vi.fn();

vi.mock('@/utils/adminCheck', () => ({
  useIsAdmin: () => useIsAdminMock(),
}));

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

    render(<NextSessionCard />);

    await waitFor(() => {
      expect(screen.getByText(/Session Data Unavailable/)).toBeInTheDocument();
    });
  });

  it('renders upcoming session details and allows skipping for admin', async () => {
    useIsAdminMock.mockReturnValue(true);
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          date: '2035-01-01',
          agenda: 'Quest planning',
          reminders: ['bring snacks'],
          currentGameDate: 'Day 10',
          isSkipped: false,
        }),
      })
      .mockResolvedValueOnce({ ok: true }); // for PUT
    (global.prompt as any).mockReturnValue('busy');

    render(<NextSessionCard />);

    await waitFor(() => expect(screen.getByText(/Next Session/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Skip/ }));

    await waitFor(() => expect(screen.getByText(/Session Skipped/)).toBeInTheDocument());
    expect(global.fetch).toHaveBeenLastCalledWith('/api/data/next-session', expect.objectContaining({ method: 'PUT' }));
  });

  it('resumes session when already skipped', async () => {
    useIsAdminMock.mockReturnValue(true);
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          date: '2035-01-01',
          agenda: 'Quest planning',
          reminders: ['bring snacks'],
          currentGameDate: 'Day 10',
          isSkipped: true,
          skipReason: 'weather',
        }),
      })
      .mockResolvedValueOnce({ ok: true }); // PUT

    render(<NextSessionCard />);

    await waitFor(() => expect(screen.getByText(/Session Skipped/)).toBeInTheDocument());

    fireEvent.click(screen.getByText(/Resume/));

    await waitFor(() => expect(screen.getByText(/Next Session/)).toBeInTheDocument());
  });
});
