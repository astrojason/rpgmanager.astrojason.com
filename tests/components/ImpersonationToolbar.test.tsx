import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import ImpersonationToolbar from '@/components/ImpersonationToolbar';

describe('ImpersonationToolbar', () => {
  const users = [
    { id: 'a', name: 'Alpha' },
    { id: 'b', name: 'Beta' },
  ];

  it('renders user options and marks current user', () => {
    render(
      <ImpersonationToolbar
        users={users}
        currentUserId="a"
        impersonatedUserId="b"
        onImpersonate={() => {}}
        onClear={() => {}}
      />
    );

    expect(screen.getByText(/Admin Impersonation/)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Alpha \(You\)/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Beta/ })).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();
  });

  it('calls handlers on selection and clear', () => {
    const onImpersonate = vi.fn();
    const onClear = vi.fn();
    render(
      <ImpersonationToolbar
        users={users}
        currentUserId="a"
        impersonatedUserId="b"
        onImpersonate={onImpersonate}
        onClear={onClear}
      />
    );

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'a' } });
    expect(onImpersonate).toHaveBeenCalledWith('a');

    fireEvent.click(screen.getByText('Clear'));
    expect(onClear).toHaveBeenCalled();
  });
});
