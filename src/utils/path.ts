export function normalizePath(pathInput: string): string {
  return pathInput.replace(/\\/g, '/').replace(/^\/+/, '');
}

export function getFilename(pathInput: string): string {
  const norm = normalizePath(pathInput);
  return norm.split('/').pop() || norm;
}

export function getBasename(pathInput: string): string {
  const filename = getFilename(pathInput);
  return filename.replace(/\.(md|markdown|txt)$/i, '');
}

export function getDirname(pathInput: string): string {
  const norm = normalizePath(pathInput);
  const parts = norm.split('/');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('/');
}

export function joinPath(...parts: string[]): string {
  return parts
    .map((part) => part.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

export function ensureMarkdownExtension(name: string, isDirectory: boolean): string {
  if (isDirectory) return name;
  return name.endsWith('.md') || name.endsWith('.markdown') ? name : `${name}.md`;
}
