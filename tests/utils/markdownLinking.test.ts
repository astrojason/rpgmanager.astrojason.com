import { afterEach, describe, expect, it } from 'vitest';
import { convertMarkdownLinks, parseMarkdownWithLinks, resetLinkMapCache, seedLinkMap } from '@/utils/markdownLinking';

afterEach(() => {
  resetLinkMapCache();
});

describe('markdown linking utilities', () => {
  it('converts known entity references to styled links', () => {
    seedLinkMap([{ name: 'Aria', url: '/pcs/aria', type: 'pc' }]);

    const html = convertMarkdownLinks('Meet [[Aria]] in town.');

    expect(html).toContain('<a href="/pcs/aria"');
    expect(html).toContain('text-orange-600');
    expect(html).toContain('Aria');
  });

  it('renders missing entities differently for admins vs players', () => {
    const adminView = convertMarkdownLinks('Unknown [[Mystery]]', true);
    const playerView = convertMarkdownLinks('Unknown [[Mystery]]', false);

    expect(adminView).toContain('Missing entity: Mystery');
    expect(adminView).toContain('text-red-600');
    expect(playerView).toBe('Unknown Mystery');
  });

  it('parses markdown and converts newlines to breaks', () => {
    seedLinkMap([{ name: 'Aria', url: '/pcs/aria', type: 'pc' }]);
    const parsed = parseMarkdownWithLinks('Hi [[Aria]]\nBye');

    expect(parsed).toContain('<br />');
    expect(parsed).toContain('/pcs/aria');
  });
});
