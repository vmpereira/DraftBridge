import { NoteCodec } from '../codec';
import { LinkResolution, NoteIndexEntry } from '@/types';
import { getDirname } from '@/utils/path';

export class WikiLinkResolver {
  private entries: Map<string, NoteIndexEntry> = new Map();

  /**
   * Updates the in-memory index from a list of workspace file paths and raw contents.
   */
  updateIndex(files: Array<{ path: string; rawContent: string }>): void {
    this.entries.clear();

    for (const file of files) {
      const parsed = NoteCodec.decode(file.rawContent);
      const normalizedPath = file.path.replace(/\\/g, '/');
      const filename = normalizedPath.split('/').pop()?.replace(/\.md$/i, '') || '';
      const title = parsed.frontmatter.title || filename;

      this.entries.set(normalizedPath, {
        title,
        path: normalizedPath,
        tags: parsed.tags,
        links: parsed.links,
      });
    }
  }

  /**
   * Fast search across note titles and file paths.
   */
  searchNotes(query: string): Array<{ title: string; path: string }> {
    const q = query.trim().toLowerCase();
    const results: Array<{ title: string; path: string }> = [];

    for (const entry of this.entries.values()) {
      if (!q || entry.title.toLowerCase().includes(q) || entry.path.toLowerCase().includes(q)) {
        results.push({ title: entry.title, path: entry.path });
      }
    }

    return results;
  }

  /**
   * Resolves a [[link]] target to an existing file path or flags missing.
   */
  resolveLink(linkText: string, currentFilePath?: string): LinkResolution {
    const target = linkText.trim().toLowerCase().replace(/\.md$/i, '');

    // Check sibling resolution relative to currentFilePath first (prioritize local directory notes)
    if (currentFilePath) {
      const parent = getDirname(currentFilePath);
      const siblingPath = parent ? `${parent}/${target}.md`.toLowerCase() : `${target}.md`.toLowerCase();
      for (const entry of this.entries.values()) {
        const normEntryPath = entry.path.toLowerCase();
        const entryParent = getDirname(entry.path);
        const filename = entry.path.split('/').pop()?.replace(/\.md$/i, '').toLowerCase();
        const title = entry.title.toLowerCase();

        if (normEntryPath === siblingPath || (entryParent === parent && (title === target || filename === target))) {
          return { status: 'exists', targetPath: entry.path };
        }
      }
    }

    // Check by exact path, title, or filename across workspace
    for (const entry of this.entries.values()) {
      const filename = entry.path.split('/').pop()?.replace(/\.md$/i, '').toLowerCase();
      const title = entry.title.toLowerCase();

      if (title === target || filename === target || entry.path.toLowerCase() === target) {
        return { status: 'exists', targetPath: entry.path };
      }
    }

    // Propose creation path (relative to workspace/target directory)
    const suggested = `${linkText.trim()}.md`;
    return { status: 'missing', suggestedPath: suggested };
  }

  /**
   * Aggregates all tags across indexed notes with count and paths.
   */
  searchTags(tagQuery?: string): Array<{ tag: string; count: number; paths: string[] }> {
    const tagMap = new Map<string, string[]>();
    const q = tagQuery?.trim().toLowerCase();

    for (const entry of this.entries.values()) {
      for (const tag of entry.tags) {
        if (!q || tag.toLowerCase().includes(q)) {
          const list = tagMap.get(tag) || [];
          if (!list.includes(entry.path)) list.push(entry.path);
          tagMap.set(tag, list);
        }
      }
    }

    return Array.from(tagMap.entries())
      .map(([tag, paths]) => ({
        tag,
        count: paths.length,
        paths,
      }))
      .sort((a, b) => b.count - a.count);
  }
}
