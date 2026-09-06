import { describe, it, expect } from 'vitest';
import { MemoryFsAdapter } from './memory-adapter';

describe('MemoryFsAdapter', () => {
  it('reads, writes, creates, and renames virtual files', async () => {
    const fs = new MemoryFsAdapter({
      'notes/index.md': '# Home',
    });

    // Read
    const home = await fs.readFile('notes/index.md');
    expect(home).toBe('# Home');

    // Create
    await fs.createFile('notes/sub/doc.md', 'Content');
    const doc = await fs.readFile('notes/sub/doc.md');
    expect(doc).toBe('Content');

    // Rename
    await fs.renameFile('notes/sub/doc.md', 'notes/sub/renamed.md');
    const renamed = await fs.readFile('notes/sub/renamed.md');
    expect(renamed).toBe('Content');

    // Tree
    const tree = await fs.listTree('notes');
    expect(tree.length).toBeGreaterThanOrEqual(1);
    const indexNode = tree.find((n) => n.name === 'index.md');
    expect(indexNode?.isDirectory).toBe(false);
  });

  it('rejects when reading non-existent file', async () => {
    const fs = new MemoryFsAdapter();
    await expect(fs.readFile('non-existent.md')).rejects.toThrow('File not found');
  });

  it('returns an existing readable file for openDialog("file")', async () => {
    const fs = new MemoryFsAdapter({
      'notes/Welcome.md': '# Welcome',
    });
    const opened = await fs.openDialog('file');
    expect(opened).toBeTruthy();
    const content = await fs.readFile(opened!);
    expect(content).toBe('# Welcome');
  });

  it('supports case-insensitive path reading', async () => {
    const fs = new MemoryFsAdapter({
      'notes/Welcome.md': '# Welcome',
    });
    const content = await fs.readFile('notes/welcome.md');
    expect(content).toBe('# Welcome');
  });

  it('reads by basename fallback if folder prefix differs', async () => {
    const fs = new MemoryFsAdapter({
      'Welcome.md': '# Root Welcome',
    });
    const content = await fs.readFile('notes/welcome.md');
    expect(content).toBe('# Root Welcome');
  });
});


