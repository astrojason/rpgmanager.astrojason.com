import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EntityTagPicker from '@/components/EntityTagPicker';

const npcs = [{ id: 'n1', name: 'Grendel' }];
const pcs = [{ id: 'p1', name: 'Aria' }];

describe('EntityTagPicker', () => {
  it('does not render a Locations tab when locations are omitted', () => {
    render(
      <EntityTagPicker
        npcs={npcs}
        selectedNpcs={[]}
        onNpcsChange={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /locations/i })).toBeNull();
  });

  it('renders a PCs tab and toggles selection when pcs/onPcsChange are provided', () => {
    const onPcsChange = vi.fn();
    render(
      <EntityTagPicker
        npcs={npcs}
        selectedNpcs={[]}
        onNpcsChange={vi.fn()}
        pcs={pcs}
        selectedPcs={[]}
        onPcsChange={onPcsChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /^pcs/i }));
    fireEvent.click(screen.getByText('Aria'));
    expect(onPcsChange).toHaveBeenCalledWith(['p1']);
  });

  it('does not render a PCs tab when onPcsChange is omitted', () => {
    render(
      <EntityTagPicker
        npcs={npcs}
        selectedNpcs={[]}
        onNpcsChange={vi.fn()}
        pcs={pcs}
      />
    );
    expect(screen.queryByRole('button', { name: /^pcs/i })).toBeNull();
  });

  it('counts selected pcs and locations toward the total selected badge', () => {
    render(
      <EntityTagPicker
        npcs={npcs}
        selectedNpcs={[]}
        onNpcsChange={vi.fn()}
        pcs={pcs}
        selectedPcs={['p1']}
        onPcsChange={vi.fn()}
      />
    );
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('Aria ×')).toBeTruthy();
  });
});
