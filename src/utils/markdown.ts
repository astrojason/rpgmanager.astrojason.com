import { marked } from "marked";
import { parseMarkdownWithLinks } from "@/utils/markdownLinking";

/**
 * Render markdown to HTML, optionally converting custom [[Name]] links.
 */
export function renderMarkdown(markdown: string): string {
  try {
    return marked.parse(markdown, { breaks: true, gfm: true }) as string;
  } catch (error) {
    console.warn("Failed to parse markdown:", error);
    return markdown;
  }
}

/**
 * Render markdown and convert custom entity links with admin-aware styling.
 */
export function renderMarkdownWithLinks(markdown: string, isAdmin: boolean = false): string {
  const html = renderMarkdown(markdown);
  return parseMarkdownWithLinks(html, isAdmin);
}

