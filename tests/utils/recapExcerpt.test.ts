import { describe, expect, it } from 'vitest';
import { recapExcerpt } from '@/utils/recapExcerpt';

describe('recapExcerpt', () => {
  it('strips markdown and wikilink-style syntax', () => {
    expect(recapExcerpt('# Title\n\nThe **party** met [Bob](/npcs/1) at the *inn*.', 200)).toBe(
      'Title The party met Bob at the inn.'
    );
  });

  it('truncates on a word boundary with an ellipsis', () => {
    expect(recapExcerpt('one two three four five', 12)).toBe('one two…');
  });

  it('returns the text unchanged when short enough', () => {
    expect(recapExcerpt('short recap', 100)).toBe('short recap');
  });

  it('returns an empty string for empty input', () => {
    expect(recapExcerpt('', 100)).toBe('');
  });
});
