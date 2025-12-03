import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import InteractiveImage from '@/components/InteractiveImage';

const locations = [
  {
    id: 'loc-1',
    name: 'Harbor',
    teaser: 'A bustling port.',
    x: 10,
    y: 20,
    width: 15,
    height: 10,
  },
];

describe('InteractiveImage', () => {
  it('renders hotspots and calls click handler', () => {
    const onAreaClick = vi.fn();

    const { container } = render(
      <InteractiveImage
        src="/map.png"
        alt="Map"
        locations={locations as any}
        width={500}
        height={400}
        onAreaClick={onAreaClick}
      />
    );

    const hotspot = container.querySelector('#interactive-image-container div[style]') as HTMLElement;
    expect(hotspot).toBeTruthy();

    fireEvent.click(hotspot);
    expect(onAreaClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'loc-1' }));
  });

  it('shows tooltip on hover with markdown content', () => {
    const { container } = render(
      <InteractiveImage
        src="/map.png"
        alt="Map"
        locations={locations as any}
        width={500}
        height={400}
      />
    );

    const hotspot = container.querySelector('#interactive-image-container div[style]') as HTMLElement;
    fireEvent.mouseEnter(hotspot);
    fireEvent.mouseMove(hotspot, { clientX: 100, clientY: 100 });

    expect(screen.getByText('Harbor')).toBeInTheDocument();
    expect(screen.getByText('A bustling port.')).toBeInTheDocument();
  });
});
