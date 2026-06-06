import { afterEach, describe, expect, it } from 'vitest';
import { convertMarkdownLinks, parseMarkdownWithLinks, resetLinkMapCache, seedLinkMap, autoLinkEntitiesInHtml } from '@/utils/markdownLinking';
import type { AutoLinkEntity } from '@/utils/markdownLinking';

const silvara: AutoLinkEntity = { id: '5', name: 'Silvara', url: '/campaign/deities/5', type: 'deity' };

afterEach(() => {
  resetLinkMapCache();
});

describe('convertMarkdownLinks with autoLinkEntities', () => {
  it('creates a link when entity is in autoLinkEntities and not in seedLinkMap', () => {
    const result = convertMarkdownLinks('Prayed to [[Silvara]] last night.', false, [silvara]);
    expect(result).toContain('href="/campaign/deities/5"');
    expect(result).toContain('>Silvara<');
  });

  it('autoLinkEntitiesInHtml does not double-link a [[Name]] already linked by convertMarkdownLinks', () => {
    const withBrackets = convertMarkdownLinks('Prayed to [[Silvara]] last night. Silvara watches.', false, [silvara]);
    const result = autoLinkEntitiesInHtml(withBrackets, [silvara]);
    const links = result.match(/href="\/campaign\/deities\/5"/g);
    expect(links).toHaveLength(2); // one from [[Silvara]], one from the plain "Silvara watches"
  });

  it('still shows plain text for unknown entities (non-admin)', () => {
    const result = convertMarkdownLinks('Met [[Unknown]] there.', false);
    expect(result).toBe('Met Unknown there.');
  });

  it('still shows red span for unknown entities (admin)', () => {
    const result = convertMarkdownLinks('Met [[Unknown]] there.', true);
    expect(result).toContain('Missing entity: Unknown');
  });
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

describe('autoLinkEntitiesInHtml', () => {
  const npcEntity: AutoLinkEntity = { id: '1', name: 'Veldris', url: '/campaign/npcs/1', type: 'npc' };
  const locationEntity: AutoLinkEntity = { id: '2', name: 'Stormharbor', url: '/campaign/locations/2', type: 'location' };

  it('replaces entity names in plain text with links', () => {
    const html = '<p>The party met Veldris in Stormharbor.</p>';
    const result = autoLinkEntitiesInHtml(html, [npcEntity, locationEntity]);
    expect(result).toContain('href="/campaign/npcs/1"');
    expect(result).toContain('href="/campaign/locations/2"');
    expect(result).toContain('>Veldris<');
    expect(result).toContain('>Stormharbor<');
  });

  it('does not double-link text already inside an anchor tag', () => {
    const html = '<p><a href="/campaign/npcs/1">Veldris</a> met Veldris again.</p>';
    const result = autoLinkEntitiesInHtml(html, [npcEntity]);
    const matches = result.match(/href="\/campaign\/npcs\/1"/g);
    expect(matches).toHaveLength(2);
  });

  it('returns html unchanged when no entities given', () => {
    const html = '<p>Hello world</p>';
    expect(autoLinkEntitiesInHtml(html, [])).toBe(html);
  });

  it('matches whole words only, not partial matches', () => {
    const entity: AutoLinkEntity = { id: '3', name: 'Tor', url: '/campaign/npcs/3', type: 'npc' };
    const html = '<p>Torment was not Tor.</p>';
    const result = autoLinkEntitiesInHtml(html, [entity]);
    expect(result).toContain('>Tor<');
    expect(result).not.toMatch(/href[^>]*>Torment/);
  });

  it('longer names take priority over shorter partial names', () => {
    const short: AutoLinkEntity = { id: '1', name: 'Storm', url: '/s', type: 'location' };
    const long: AutoLinkEntity = { id: '2', name: 'Stormharbor', url: '/sh', type: 'location' };
    const html = '<p>Visit Stormharbor now.</p>';
    const result = autoLinkEntitiesInHtml(html, [short, long]);
    expect(result).toContain('href="/sh"');
    expect(result).not.toContain('href="/s"');
  });

  it('matches on alias when text uses an alias instead of primary name', () => {
    const entity: AutoLinkEntity = { id: '5', name: 'Barrow Ironhoof', url: '/campaign/npcs/5', type: 'npc', aliases: ['The Bull', 'Old Barrow'] };
    const html = '<p>The Bull charged through the gate. Old Barrow watched.</p>';
    const result = autoLinkEntitiesInHtml(html, [entity]);
    const links = result.match(/href="\/campaign\/npcs\/5"/g);
    expect(links).toHaveLength(2);
  });

});
