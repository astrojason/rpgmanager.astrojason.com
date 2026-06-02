import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBlock from '@/components/ErrorBlock';

describe('ErrorBlock', () => {
  it('renders the full error message', () => {
    render(<ErrorBlock error="Something went catastrophically wrong" />);
    expect(screen.getByText('Something went catastrophically wrong')).toBeTruthy();
  });

  it('has a copy button', () => {
    render(<ErrorBlock error="test error" />);
    expect(screen.getByRole('button', { name: /copy/i })).toBeTruthy();
  });

  it('calls onDismiss when dismiss button clicked', () => {
    const dismiss = vi.fn();
    render(<ErrorBlock error="test error" onDismiss={dismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('does not render dismiss button when onDismiss not provided', () => {
    render(<ErrorBlock error="test error" />);
    expect(screen.queryByRole('button', { name: /dismiss/i })).toBeNull();
  });
});
