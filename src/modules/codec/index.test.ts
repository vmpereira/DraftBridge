import { describe, it, expect } from 'vitest';
import { NoteCodec } from './index';

describe('NoteCodec', () => {
  it('decodes markdown with YAML frontmatter, links, and tags', () => {
    const raw = `---
title: My First Note
tags:
  - obsidian
  - design
status: draft
---

# Hello World

Here is a link to [[Second Note]] and [[Deep/Nested Note]].
Don't forget to check #planning and #urgent/bug.
`;

    const parsed = NoteCodec.decode(raw);

    expect(parsed.frontmatter.title).toBe('My First Note');
    expect(parsed.frontmatter.status).toBe('draft');
    expect(parsed.content).toContain('# Hello World');
    expect(parsed.content).not.toContain('title: My First Note');

    expect(parsed.links).toEqual(['Second Note', 'Deep/Nested Note']);
    expect(parsed.tags).toContain('obsidian');
    expect(parsed.tags).toContain('design');
    expect(parsed.tags).toContain('planning');
    expect(parsed.tags).toContain('urgent/bug');
  });

  it('handles markdown without frontmatter', () => {
    const raw = 'Just a simple note with a [[Link]] and #lonely-tag.';
    const parsed = NoteCodec.decode(raw);

    expect(parsed.frontmatter).toEqual({});
    expect(parsed.content).toBe(raw);
    expect(parsed.links).toEqual(['Link']);
    expect(parsed.tags).toEqual(['lonely-tag']);
  });

  it('encodes frontmatter and content into valid YAML markdown', () => {
    const frontmatter = {
      title: 'Encoded Note',
      tags: ['test'],
    };
    const content = 'This is the note body with [[Another Note]].';

    const encoded = NoteCodec.encode(frontmatter, content);

    expect(encoded).toContain('---');
    expect(encoded).toContain('title: Encoded Note');
    expect(encoded).toContain(content);

    // Round-trip verification
    const roundTrip = NoteCodec.decode(encoded);
    expect(roundTrip.frontmatter.title).toBe('Encoded Note');
    expect(roundTrip.content.trim()).toBe(content);
    expect(roundTrip.links).toEqual(['Another Note']);
  });

  it('encodes cleanly when frontmatter is empty', () => {
    const content = 'Plain markdown text';
    const encoded = NoteCodec.encode({}, content);
    expect(encoded).toBe(content);
  });

  it('finds wiki link target at character offset', () => {
    const text = 'Check [[Second Note|Alternative Label]] or [[Third Note]]';
    // Inside first link
    expect(NoteCodec.findWikiLinkAt(text, 10)).toBe('Second Note');
    // Inside second link
    expect(NoteCodec.findWikiLinkAt(text, 48)).toBe('Third Note');
    // Outside any link
    expect(NoteCodec.findWikiLinkAt(text, 0)).toBeNull();
  });

  it('finds tag at character offset', () => {
    const text = 'Tags like #ideas/deep and #urgent';
    expect(NoteCodec.findTagAt(text, 12)).toBe('ideas/deep');
    expect(NoteCodec.findTagAt(text, 0)).toBeNull();
  });

  it('does not span across unmatched opening brackets', () => {
    const text = "Link to another note by typing '[[' — try creating a link to [[Second Note]]!";
    const parsed = NoteCodec.decode(text);
    expect(parsed.links).toEqual(['Second Note']);
    expect(NoteCodec.findWikiLinkAt(text, text.indexOf('Second Note'))).toBe('Second Note');
    expect(NoteCodec.findWikiLinkAt(text, text.indexOf("[['"))).toBeNull();
  });
});
