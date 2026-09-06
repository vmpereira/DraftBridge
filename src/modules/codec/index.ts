import matter from 'gray-matter';
import yaml from 'js-yaml';
import { ParsedNote } from '@/types';

// Regex for [[wiki-links]] (disallowing [, ], |, and newlines inside link target)
const WIKI_LINK_REGEX = /\[\[([^\[\]|\n]+)(?:\|([^\[\]|\n]+))?\]\]/g;

// Regex for #tags (avoiding # headings at line starts, matching words, hyphens, slashes)
const TAG_REGEX = /(?:^|\s)#([a-zA-Z0-9_\-]+(?:\/[a-zA-Z0-9_\-]+)*)(?=\s|$|[.,;:!?])/g;

export const NoteCodec = {
  /**
   * Decodes a raw Markdown string into structured frontmatter, content body,
   * unique tags, and wiki-link references.
   */
  decode(rawMarkdown: string): ParsedNote {
    const { data: frontmatter, content } = matter(rawMarkdown);

    // Extract [[links]]
    const links: string[] = [];
    let linkMatch: RegExpExecArray | null;
    while ((linkMatch = WIKI_LINK_REGEX.exec(content)) !== null) {
      const target = linkMatch[1].trim();
      if (target && !links.includes(target)) {
        links.push(target);
      }
    }

    // Extract #tags from body
    const bodyTags: string[] = [];
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = TAG_REGEX.exec(content)) !== null) {
      const tag = tagMatch[1].trim();
      if (tag && !bodyTags.includes(tag)) {
        bodyTags.push(tag);
      }
    }

    // Extract tags from frontmatter (tags: ['a', 'b'] or tags: "a, b" or tag: "a")
    const fmTags: string[] = [];
    if (Array.isArray(frontmatter.tags)) {
      frontmatter.tags.forEach((t: any) => {
        if (typeof t === 'string' && t.trim()) fmTags.push(t.trim());
      });
    } else if (typeof frontmatter.tags === 'string') {
      frontmatter.tags.split(',').forEach((t: string) => {
        if (t.trim()) fmTags.push(t.trim());
      });
    } else if (typeof frontmatter.tag === 'string') {
      if (frontmatter.tag.trim()) fmTags.push(frontmatter.tag.trim());
    }

    // Merge unique tags
    const allTags = Array.from(new Set([...fmTags, ...bodyTags]));

    return {
      frontmatter: frontmatter || {},
      content,
      tags: allTags,
      links,
    };
  },

  /**
   * Encodes frontmatter metadata and clean markdown body into standard .md text.
   */
  encode(frontmatter: Record<string, any>, markdownBody: string): string {
    const keys = Object.keys(frontmatter || {});
    if (keys.length === 0) {
      return markdownBody;
    }

    // Format with gray-matter
    return matter.stringify(markdownBody, frontmatter);
  },

  /**
   * Finds the target note title if the given character offset in text falls inside a [[wiki-link]].
   */
  findWikiLinkAt(text: string, charOffset: number): string | null {
    const regex = /\[\[([^\[\]|\n]+)(?:\|([^\[\]|\n]+))?\]\]/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const start = match.index;
      const end = start + match[0].length;
      if (charOffset >= start && charOffset <= end) {
        return match[1].trim();
      }
    }
    return null;
  },

  /**
   * Finds the tag name if the given character offset in text falls inside a #tag.
   */
  findTagAt(text: string, charOffset: number): string | null {
    const regex = /(?:^|\s)#([a-zA-Z0-9_\-]+(?:\/[a-zA-Z0-9_\-]+)*)(?=\s|$|[.,;:!?])/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const full = match[0];
      const tag = match[1];
      const tagOffset = full.indexOf('#');
      const start = match.index + tagOffset;
      const end = start + tag.length + 1;
      if (charOffset >= start && charOffset <= end) {
        return tag;
      }
    }
    return null;
  },
};

