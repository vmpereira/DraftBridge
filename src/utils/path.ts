export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\/+/, '');
}

export function getFilename(p: string): string {
  const norm = normalizePath(p);
  return norm.split('/').pop() || norm;
}

export function getBasename(p: string): string {
  const filename = getFilename(p);
  return filename.replace(/\.(md|markdown|txt)$/i, '');
}

export function getDirname(p: string): string {
  const norm = normalizePath(p);
  const parts = norm.split('/');
  if (parts.length <= 1) return '';
  return parts.slice(0, -1).join('/');
}

export function joinPath(...parts: string[]): string {
  return parts
    .map((p) => p.replace(/\\/g, '/').replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}
