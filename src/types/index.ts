export interface ParsedNote {
  frontmatter: Record<string, any>;
  content: string;
  tags: string[];
  links: string[];
}

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

export type LinkResolution =
  | { status: 'exists'; targetPath: string }
  | { status: 'missing'; suggestedPath: string };

export interface NoteIndexEntry {
  title: string;
  path: string;
  tags: string[];
  links: string[];
}

export interface OpenTab {
  path: string;
  name: string;
  frontmatter: Record<string, any>;
  content: string;
  isDirty: boolean;
}

