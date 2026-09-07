import { describe, it, expect } from 'vitest';
import { normalizePath, getFilename, getBasename, getDirname, joinPath, ensureMarkdownExtension } from './path';

describe('path utils', () => {
  it('normalizes windows and unix paths', () => {
    expect(normalizePath('foo\\bar\\baz.md')).toBe('foo/bar/baz.md');
    expect(normalizePath('/leading/slash.md')).toBe('leading/slash.md');
    expect(normalizePath('\\leading\\backslash.md')).toBe('leading/backslash.md');
  });

  it('extracts filename and basename', () => {
    expect(getFilename('notes/deep/my-note.md')).toBe('my-note.md');
    expect(getBasename('notes/deep/my-note.md')).toBe('my-note');
    expect(getFilename('standalone.md')).toBe('standalone.md');
    expect(getBasename('standalone.md')).toBe('standalone');
  });

  it('extracts dirname', () => {
    expect(getDirname('notes/sub/doc.md')).toBe('notes/sub');
    expect(getDirname('root-file.md')).toBe('');
  });

  it('joins paths cleanly without redundant slashes', () => {
    expect(joinPath('notes', 'sub', 'doc.md')).toBe('notes/sub/doc.md');
    expect(joinPath('notes/', '/doc.md')).toBe('notes/doc.md');
  });

  it('ensures markdown extension properly', () => {
    expect(ensureMarkdownExtension('note', false)).toBe('note.md');
    expect(ensureMarkdownExtension('note.md', false)).toBe('note.md');
    expect(ensureMarkdownExtension('my-folder', true)).toBe('my-folder');
  });
});
