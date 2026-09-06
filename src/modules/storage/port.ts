import { FileNode } from '@/types';

export interface FileSystemPort {
  openDialog(type: 'file' | 'folder'): Promise<string | null>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  createFile(path: string, initialContent?: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  renameFile(oldPath: string, newPath: string): Promise<void>;
  listTree(rootPath: string): Promise<FileNode[]>;
  watch(targetPath: string, onChange: (path: string) => void): () => void;
}
