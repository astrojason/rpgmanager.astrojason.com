import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import DetailSidebar from '@/components/DetailSidebar';

vi.mock('@/utils/markdown', () => ({
  renderMarkdownWithLinks: (md: string) => `<p>${md}</p>`,
}));
vi.mock('@/utils/adminCheck', () => ({ useIsAdmin: () => true }));
vi.mock('@/utils/role', () => ({ useIsDM: () => true }));

const area = {
  id: '1',
  name: 'Harbor',
  detail: 'Details **here**',
  gm_notes: 'GM only',
} as any;

describe('DetailSidebar', () => {
  it('renders nothing when closed or area missing', () => {
    const { container } = render(<DetailSidebar area={null} isOpen={false} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows content and closes via backdrop and button', async () => {
    const onClose = vi.fn();
    render(<DetailSidebar area={area} isOpen onClose={onClose} />);

    await waitFor(() => expect(screen.getByText('Harbor')).toBeInTheDocument());
    expect(screen.getByText('GM only')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close sidebar'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('backdrop'), { bubbles: true });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
