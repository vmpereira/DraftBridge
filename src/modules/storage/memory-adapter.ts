import { FileSystemPort } from './port';
import { FileNode } from '@/types';
import { normalizePath } from '@/utils/path';

export class InMemoryFsAdapter implements FileSystemPort {
  private files: Map<string, string> = new Map();
  private folders: Set<string> = new Set();
  private watchers: Set<(path: string) => void> = new Set();

  constructor(initialFiles?: Record<string, string>) {
    if (initialFiles) {
      for (const [p, content] of Object.entries(initialFiles)) {
        this.files.set(normalizePath(p), content);
      }
    }
  }

  private normalize(p: string): string {
    return normalizePath(p);
  }

  private resolveKey(filePath: string): string | null {
    const norm = this.normalize(filePath);
    if (this.files.has(norm)) return norm;
    const lower = norm.toLowerCase();
    for (const key of this.files.keys()) {
      if (key.toLowerCase() === lower) {
        return key;
      }
    }

    // Basename fallback only when path has no directory (or for root test files like 'Welcome.md')
    const hasDir = norm.includes('/');
    if (!hasDir) {
      const base = norm.toLowerCase();
      for (const key of this.files.keys()) {
        if (key.split('/').pop()?.toLowerCase() === base) {
          return key;
        }
      }
    } else {
      // If path specifies a directory, only match if the parent directory matches or key has no directory
      const base = norm.split('/').pop()?.toLowerCase();
      for (const key of this.files.keys()) {
        if (!key.includes('/') && key.toLowerCase() === base) {
          return key;
        }
      }
    }
    return null;
  }

  async openDialog(type: 'file' | 'folder'): Promise<string | null> {
    // In real browser DOM (when user tests in browser preview outside Electron):
    if (typeof document !== 'undefined' && typeof window !== 'undefined' && typeof document.createElement === 'function') {
      return new Promise<string | null>((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        if (type === 'folder') {
          input.setAttribute('webkitdirectory', '');
          input.setAttribute('directory', '');
        } else {
          input.accept = '.md,.markdown,.txt';
        }

        input.onchange = async () => {
          if (!input.files || input.files.length === 0) {
            resolve(null);
            return;
          }

          if (type === 'folder') {
            const first = input.files[0];
            const folderName = first.webkitRelativePath
              ? first.webkitRelativePath.split('/')[0]
              : 'notes';

            for (let i = 0; i < input.files.length; i++) {
              const file = input.files[i];
              if (file.name.endsWith('.md') || file.name.endsWith('.markdown') || file.name.endsWith('.txt')) {
                const text = await file.text();
                const path = file.webkitRelativePath || `${folderName}/${file.name}`;
                this.files.set(this.normalize(path), text);
              }
            }
            resolve(folderName);
          } else {
            const file = input.files[0];
            const text = await file.text();
            const path = `notes/${file.name}`;
            this.files.set(this.normalize(path), text);
            resolve(path);
          }
        };

        input.oncancel = () => resolve(null);
        input.click();
      });
    }

    // Headless / test environment fallback
    if (type === 'folder') {
      return 'notes';
    }
    for (const key of this.files.keys()) {
      return key;
    }
    return 'notes/Welcome.md';
  }

  async readFile(filePath: string): Promise<string> {
    const key = this.resolveKey(filePath);
    if (!key) {
      throw new Error(`File not found: ${filePath}`);
    }
    return this.files.get(key)!;
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    const key = this.resolveKey(filePath) || this.normalize(filePath);
    this.files.set(key, content);
    this.notify(key);
  }

  async createFile(filePath: string, initialContent = ''): Promise<void> {
    const existing = this.resolveKey(filePath);
    if (existing) {
      throw new Error(`File already exists: ${filePath}`);
    }
    const key = this.normalize(filePath);
    this.files.set(key, initialContent);
    this.notify(key);
  }

  async createFolder(folderPath: string): Promise<void> {
    const key = this.normalize(folderPath);
    this.folders.add(key);
    this.notify(key);
  }

  async deleteFile(filePath: string): Promise<void> {
    const norm = this.normalize(filePath);
    const key = this.resolveKey(filePath) || norm;
    this.files.delete(key);
    this.folders.delete(key);

    // Cascade delete to nested files and folders
    const prefix = `${norm}/`;
    for (const f of Array.from(this.files.keys())) {
      if (f.startsWith(prefix)) {
        this.files.delete(f);
      }
    }
    for (const folder of Array.from(this.folders)) {
      if (folder.startsWith(prefix)) {
        this.folders.delete(folder);
      }
    }
    this.notify(norm);
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    const oldNorm = this.normalize(oldPath);
    const newNorm = this.normalize(newPath);

    const oldKey = this.resolveKey(oldPath);
    if (oldKey) {
      const content = this.files.get(oldKey)!;
      this.files.delete(oldKey);
      this.files.set(newNorm, content);
      this.notify(newNorm);
      return;
    }

    // Check if it is a folder (explicit or implicit parent of files)
    const oldPrefix = `${oldNorm}/`;
    const matchingFiles = Array.from(this.files.keys()).filter((f) => f.startsWith(oldPrefix));
    const matchingFolders = Array.from(this.folders).filter((f) => f === oldNorm || f.startsWith(oldPrefix));

    if (matchingFiles.length === 0 && matchingFolders.length === 0) {
      throw new Error(`File not found: ${oldPath}`);
    }

    // Rename matching files
    for (const file of matchingFiles) {
      const content = this.files.get(file)!;
      this.files.delete(file);
      const updatedFile = `${newNorm}/${file.slice(oldPrefix.length)}`;
      this.files.set(updatedFile, content);
    }

    // Rename matching folders
    for (const folder of matchingFolders) {
      this.folders.delete(folder);
      const updatedFolder = folder === oldNorm ? newNorm : `${newNorm}/${folder.slice(oldPrefix.length)}`;
      this.folders.add(updatedFolder);
    }

    this.notify(newNorm);
  }

  async listTree(rootPath: string): Promise<FileNode[]> {
    const normRoot = this.normalize(rootPath);
    const nodes: FileNode[] = [];

    // All paths including files and explicit folders
    const allPaths: Array<{ path: string; isDir: boolean }> = [
      ...Array.from(this.files.keys()).map((p) => ({ path: p, isDir: false })),
      ...Array.from(this.folders.values()).map((p) => ({ path: p, isDir: true })),
    ];

    for (const item of allPaths) {
      if (item.path.startsWith(normRoot)) {
        const relative = item.path.slice(normRoot.length).replace(/^\/+/, '');
        if (!relative) continue;
        const parts = relative.split('/');

        let currentLevel = nodes;
        let currentPath = normRoot;

        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isTarget = i === parts.length - 1;
          const isFile = isTarget && !item.isDir;
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          let existing = currentLevel.find((n) => n.name === part);
          if (!existing) {
            existing = {
              name: part,
              path: currentPath,
              isDirectory: !isFile,
              children: isFile ? undefined : [],
            };
            currentLevel.push(existing);
          }
          if (!isFile && existing.children) {
            currentLevel = existing.children;
          }
        }
      }
    }

    return nodes;
  }

  watch(targetPath: string, onChange: (path: string) => void): () => void {
    this.watchers.add(onChange);
    return () => this.watchers.delete(onChange);
  }

  private notify(path: string) {
    for (const listener of this.watchers) {
      listener(path);
    }
  }
}

// Backwards compatibility alias
export const MemoryFsAdapter = InMemoryFsAdapter;
