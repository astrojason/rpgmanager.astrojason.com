import { marked } from "marked";
import { autoLinkEntitiesInHtml, parseMarkdownWithLinks } from "@/utils/markdownLinking";
import type { AutoLinkEntity } from "@/utils/markdownLinking";

export type { AutoLinkEntity };

export function renderMarkdown(markdown: string): string {
  try {
    return marked.parse(markdown, { breaks: true, gfm: true }) as string;
  } catch (error) {
    console.warn("Failed to parse markdown:", error);
    return markdown;
  }
}

export function renderMarkdownWithLinks(
  markdown: string,
  isAdmin: boolean = false,
  entities?: AutoLinkEntity[]
): string {
  const html = renderMarkdown(markdown);
  const linked = parseMarkdownWithLinks(html, isAdmin);
  return entities?.length ? autoLinkEntitiesInHtml(linked, entities) : linked;
}

