import { describe, it, expect } from 'vitest';
import { WikiLinkResolver } from './index';

describe('WikiLinkResolver', () => {
  const resolver = new WikiLinkResolver();

  resolver.updateIndex([
    {
      path: 'notes/architecture.md',
      rawContent: `---
title: System Architecture
tags: [core, design]
---
# Architecture Overview
Link to [[Database Design]]
`,
    },
    {
      path: 'notes/database-design.md',
      rawContent: `---
title: Database Design
tags: [core, data]
---
# Database
Check #perf
`,
    },
    {
      path: 'ideas.md',
      rawContent: '# Random Ideas\nLink to [[NonExistent]]',
    },
  ]);

  it('searches notes by title or filename', () => {
    const results = resolver.searchNotes('Arch');
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('System Architecture');
    expect(results[0].path).toBe('notes/architecture.md');

    const byFilename = resolver.searchNotes('ideas');
    expect(byFilename.length).toBe(1);
    expect(byFilename[0].title).toBe('ideas');
  });

  it('resolves existing links regardless of casing', () => {
    const res = resolver.resolveLink('system architecture');
    expect(res.status).toBe('exists');
    if (res.status === 'exists') {
      expect(res.targetPath).toBe('notes/architecture.md');
    }

    const byFile = resolver.resolveLink('database-design');
    expect(byFile.status).toBe('exists');
  });

  it('prioritizes sibling directory files over identical titles in distant folders', () => {
    const localResolver = new WikiLinkResolver();
    localResolver.updateIndex([
      { path: 'archive/readme.md', rawContent: '# Readme\nArchive doc' },
      { path: 'project/readme.md', rawContent: '# Readme\nProject doc' },
    ]);

    const resolved = localResolver.resolveLink('readme', 'project/other.md');
    expect(resolved.status).toBe('exists');
    if (resolved.status === 'exists') {
      expect(resolved.targetPath).toBe('project/readme.md');
    }
  });

  it('identifies missing links and proposes suggested creation filename', () => {
    const res = resolver.resolveLink('NonExistent Note', 'notes/architecture.md');
    expect(res.status).toBe('missing');
    if (res.status === 'missing') {
      // Suggested path is relative filename or relative subpath, not prepended with workspace folder
      expect(res.suggestedPath).toBe('NonExistent Note.md');
    }
  });

  it('aggregates workspace tags accurately', () => {
    const tags = resolver.searchTags();
    const coreTag = tags.find((t) => t.tag === 'core');
    expect(coreTag).toBeDefined();
    expect(coreTag?.count).toBe(2);

    const perfTag = tags.find((t) => t.tag === 'perf');
    expect(perfTag).toBeDefined();
    expect(perfTag?.count).toBe(1);
  });
});
