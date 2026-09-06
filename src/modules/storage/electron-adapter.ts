import { FileSystemPort } from './port';
import { FileNode } from '@/types';

declare global {
  interface Window {
    electronAPI?: {
      openDialog: (type: 'file' | 'folder') => Promise<string | null>;
      readFile: (path: string) => Promise<string>;
      writeFile: (path: string, content: string) => Promise<void>;
      createFile: (path: string, initialContent?: string) => Promise<void>;
      deleteFile: (path: string) => Promise<void>;
      renameFile: (oldPath: string, newPath: string) => Promise<void>;
      listTree: (rootPath: string) => Promise<FileNode[]>;
      onFileChange: (callback: (path: string) => void) => () => void;
    };
  }
}

export class ElectronIpcAdapter implements FileSystemPort {
  private get api() {
    return typeof window !== 'undefined' ? window.electronAPI : undefined;
  }

  async openDialog(type: 'file' | 'folder'): Promise<string | null> {
    if (!this.api) return null;
    return this.api.openDialog(type);
  }

  async readFile(filePath: string): Promise<string> {
    if (!this.api) throw new Error('Electron API not available');
    return this.api.readFile(filePath);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.api) throw new Error('Electron API not available');
    return this.api.writeFile(filePath, content);
  }

  async createFile(filePath: string, initialContent = ''): Promise<void> {
    if (!this.api) throw new Error('Electron API not available');
    return this.api.createFile(filePath, initialContent);
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!this.api) throw new Error('Electron API not available');
    return this.api.deleteFile(filePath);
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    if (!this.api) throw new Error('Electron API not available');
    return this.api.renameFile(oldPath, newPath);
  }

  async listTree(rootPath: string): Promise<FileNode[]> {
    if (!this.api) return [];
    return this.api.listTree(rootPath);
  }

  watch(targetPath: string, onChange: (path: string) => void): () => void {
    if (!this.api) return () => {};
    return this.api.onFileChange(onChange);
  }
}
