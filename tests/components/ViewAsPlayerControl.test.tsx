import { act, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ViewAsPlayerControl from '@/components/ViewAsPlayerControl';
import { getViewAsPlayer, setViewAsPlayer } from '@/lib/viewAs';

const mockUseRealUserRole = vi.fn();
vi.mock('@/utils/role', () => ({
  useRealUserRole: () => mockUseRealUserRole(),
}));

function renderControl(queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ViewAsPlayerControl />
    </QueryClientProvider>
  );
}

beforeEach(() => mockUseRealUserRole.mockReturnValue('admin'));
afterEach(() => act(() => setViewAsPlayer(false)));

describe('ViewAsPlayerControl', () => {
  it('shows a view-as-player button to admins and dms', () => {
    renderControl();
    expect(screen.getByRole('button', { name: /view as player/i })).toBeTruthy();
    mockUseRealUserRole.mockReturnValue('dm');
    renderControl();
    expect(screen.getAllByRole('button', { name: /view as player/i }).length).toBeGreaterThan(0);
  });

  it('renders nothing for players and signed-out users', () => {
    mockUseRealUserRole.mockReturnValue('player');
    const { container } = renderControl();
    expect(container.firstChild).toBeNull();
    mockUseRealUserRole.mockReturnValue(null);
    const second = renderControl();
    expect(second.container.firstChild).toBeNull();
  });

  it('turns view-as on, refetches data, and offers a way back', () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    renderControl(queryClient);

    fireEvent.click(screen.getByRole('button', { name: /view as player/i }));
    expect(getViewAsPlayer()).toBe(true);
    expect(invalidate).toHaveBeenCalled();
    expect(screen.getByText(/viewing as player/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /back to gm view/i }));
    expect(getViewAsPlayer()).toBe(false);
    expect(invalidate).toHaveBeenCalledTimes(2);
  });
});
