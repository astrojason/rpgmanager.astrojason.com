import { describe, expect, it } from 'vitest';
import { findLocationById, flattenLocations, stripExteriorLabel } from '@/utils/locations';
import type { Location } from '@/types/interfaces';

const tree: Location[] = [
  {
    id: '1', name: 'Bounty', teaser: '', detail: '',
    locations: [
      { id: 'city', name: 'City', teaser: '', detail: '', locations: [{ id: 'loc-006', name: 'Bazaar', teaser: '', detail: '' }] },
    ],
  },
];

describe('stripExteriorLabel', () => {
  it.each([
    ['**Exterior:** An old coffee shop.', 'An old coffee shop.'],
    ['Exterior: An old coffee shop.', 'An old coffee shop.'],
    ['  **Exterior:**   An old coffee shop.', 'An old coffee shop.'],
    ['**Exterior**: An old coffee shop.', 'An old coffee shop.'],
    ['__Exterior:__ An old coffee shop.', 'An old coffee shop.'],
    ['A plain teaser.', 'A plain teaser.'],
    ['Outside the Exterior: wall', 'Outside the Exterior: wall'],
  ])('%j -> %j', (input, expected) => {
    expect(stripExteriorLabel(input)).toBe(expected);
  });
  it('handles empty/undefined', () => {
    expect(stripExteriorLabel(undefined)).toBe('');
    expect(stripExteriorLabel('')).toBe('');
  });
});

describe('findLocationById', () => {
  it('finds locations at any depth', () => {
    expect(findLocationById(tree, 'loc-006')?.name).toBe('Bazaar');
    expect(findLocationById(tree, 'city')?.name).toBe('City');
    expect(findLocationById(tree, '1')?.name).toBe('Bounty');
  });
  it('returns null when missing', () => {
    expect(findLocationById(tree, 'nope')).toBeNull();
  });
});

describe('flattenLocations', () => {
  it('returns every node with depth and top-level flag', () => {
    expect(flattenLocations(tree).map(e => [e.location.id, e.depth])).toEqual([['1', 0], ['city', 1], ['loc-006', 2]]);
  });
});
