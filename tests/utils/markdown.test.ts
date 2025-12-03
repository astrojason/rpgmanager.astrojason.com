import { describe, expect, it, vi } from 'vitest';
import { marked } from 'marked';
import * as markdownLinking from '@/utils/markdownLinking';
import { renderMarkdown, renderMarkdownWithLinks } from '@/utils/markdown';

describe('markdown rendering', () => {
  it('parses markdown into html', () => {
    const html = renderMarkdown('# Title');

    expect(html).toContain('<h1');
    expect(html.toLowerCase()).toContain('title');
  });

  it('returns original text if parsing throws', () => {
    const spy = vi.spyOn(marked, 'parse').mockImplementation(() => {
      throw new Error('boom');
    });
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(renderMarkdown('**bad**')).toBe('**bad**');

    spy.mockRestore();
    warnSpy.mockRestore();
  });

  it('passes rendered html through custom link converter', () => {
    const linkSpy = vi.spyOn(markdownLinking, 'parseMarkdownWithLinks').mockReturnValue('linked');

    const result = renderMarkdownWithLinks('Hello', true);

    expect(linkSpy).toHaveBeenCalledWith(expect.any(String), true);
    expect(result).toBe('linked');

    linkSpy.mockRestore();
  });
});
