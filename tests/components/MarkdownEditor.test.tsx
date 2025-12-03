import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import MarkdownEditor from '@/components/MarkdownEditor';

vi.mock('@/utils/markdown', () => ({
  renderMarkdownWithLinks: (md: string) => `<p data-testid="rendered">${md}</p>`,
}));

describe('MarkdownEditor', () => {
  it('allows editing and toggling preview', () => {
    function Wrapper() {
      const [val, setVal] = React.useState('Hello');
      return <MarkdownEditor value={val} onChange={setVal} />;
    }
    render(<Wrapper />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Updated' } });

    fireEvent.click(screen.getByRole('button', { name: /Preview/i }));
    expect(screen.getByTestId('rendered')).toHaveTextContent('Updated');

    fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows empty preview message when no content', () => {
    render(<MarkdownEditor value="" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Preview/i }));
    expect(screen.getByText(/No content to preview/)).toBeInTheDocument();
  });
});
