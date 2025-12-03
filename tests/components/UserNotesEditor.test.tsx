import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import UserNotesEditor from '@/components/UserNotesEditor';

// Simplify nested components
vi.mock('@/components/AuthorDisplay', () => ({
  __esModule: true,
  default: ({ uid }: { uid: string }) => <span>Author:{uid}</span>,
}));
vi.mock('@/components/MarkdownEditor', () => ({
  __esModule: true,
  default: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea data-testid="markdown-editor" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const baseNote = { id: 'n1', content: 'hello', timestamp: '2024-01-01T00:00:00Z', author: 'user-1' };

describe('UserNotesEditor', () => {
  const originalConfirm = global.confirm;

  beforeEach(() => {
    vi.useFakeTimers().setSystemTime(new Date('2024-05-01T00:00:00Z'));
    global.confirm = vi.fn().mockReturnValue(true);
  });

  afterEach(() => {
    vi.useRealTimers();
    global.confirm = originalConfirm;
  });

  it('adds a new note for the current user', async () => {
    const onChange = vi.fn();
    render(<UserNotesEditor notes={[]} onChange={onChange} currentUser="user-1" />);

    fireEvent.click(screen.getByRole('button', { name: /Add Note/i }));
    fireEvent.change(screen.getByTestId('markdown-editor'), { target: { value: 'new note' } });
    fireEvent.click(screen.getByTitle('Add Note'));

    expect(onChange).toHaveBeenCalled();
    const newNotes = onChange.mock.calls.at(-1)![0];
    expect(newNotes[0].content).toBe('new note');
    expect(newNotes[0].author).toBe('user-1');
  });

  it('edits an existing note when user has permission', () => {
    const onChange = vi.fn();
    render(<UserNotesEditor notes={[baseNote]} onChange={onChange} currentUser="user-1" />);

    fireEvent.click(screen.getByTitle('Edit'));
    fireEvent.change(screen.getByTestId('markdown-editor'), { target: { value: 'updated' } });
    fireEvent.click(screen.getByTitle('Save'));

    const updated = onChange.mock.calls[0][0][0];
    expect(updated.content).toBe('updated');
    expect(updated.author).toBe('user-1');
    expect(new Date(updated.timestamp).toISOString()).toContain('2024-05-01');
  });

  it('prevents editing when user lacks permission', () => {
    const onChange = vi.fn();
    render(<UserNotesEditor notes={[baseNote]} onChange={onChange} currentUser="user-2" isAdmin={false} />);

    expect(screen.queryByTitle('Edit')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  it('deletes a note after confirmation', () => {
    const onChange = vi.fn();
    render(<UserNotesEditor notes={[baseNote]} onChange={onChange} currentUser="user-1" />);

    fireEvent.click(screen.getByTitle('Delete'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
