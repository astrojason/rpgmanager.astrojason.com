import { render, screen } from '@testing-library/react';
import React from 'react';
import ComingSoonPage from '@/components/ComingSoonPage';

describe('ComingSoonPage', () => {
  it('renders provided title, description, and icon', () => {
    render(<ComingSoonPage title="Lore" description="Work in progress" icon="✨" />);

    expect(screen.getByText('Lore')).toBeInTheDocument();
    expect(screen.getByText('Work in progress')).toBeInTheDocument();
    expect(screen.getByText('✨')).toBeInTheDocument();
  });
});
