import { InMemoryFsAdapter } from './memory-adapter';

describe('InMemoryFsAdapter', () => {
  it('reads, writes, creates, and renames virtual files and folders', async () => {
    const fs = new InMemoryFsAdapter({
      'notes/index.md': '# Home',
    });

    // Read
    const home = await fs.readFile('notes/index.md');
    expect(home).toBe('# Home');

    // Create File
    await fs.createFile('notes/sub/doc.md', 'Content');
    const doc = await fs.readFile('notes/sub/doc.md');
    expect(doc).toBe('Content');

    // Create Folder
    await fs.createFolder('notes/empty-folder');
    const treeWithFolder = await fs.listTree('notes');
    const folderNode = treeWithFolder.find((n) => n.name === 'empty-folder');
    expect(folderNode?.isDirectory).toBe(true);

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
    const fs = new InMemoryFsAdapter();
    await expect(fs.readFile('non-existent.md')).rejects.toThrow('File not found');
  });

  it('returns an existing readable file for openDialog("file")', async () => {
    const fs = new InMemoryFsAdapter({
      'notes/Welcome.md': '# Welcome',
    });
    const opened = await fs.openDialog('file');
    expect(opened).toBeTruthy();
    const content = await fs.readFile(opened!);
    expect(content).toBe('# Welcome');
  });

  it('supports case-insensitive path reading', async () => {
    const fs = new InMemoryFsAdapter({
      'notes/Welcome.md': '# Welcome',
    });
    const content = await fs.readFile('notes/welcome.md');
    expect(content).toBe('# Welcome');
  });

  it('reads by basename fallback if folder prefix differs', async () => {
    const fs = new InMemoryFsAdapter({
      'Welcome.md': '# Root Welcome',
    });
    const content = await fs.readFile('notes/welcome.md');
    expect(content).toBe('# Root Welcome');
  });
});


