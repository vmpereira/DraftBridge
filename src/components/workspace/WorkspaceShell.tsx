'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FolderOpen,
  Search,
  Tag,
  Plus,
  FolderPlus,
  PanelLeftClose,
  PanelLeft,
  FileText,
} from 'lucide-react';
import { FileSystemPort } from '@/modules/storage/port';
import { ElectronIpcAdapter } from '@/modules/storage/electron-adapter';
import { InMemoryFsAdapter } from '@/modules/storage/memory-adapter';
import { NoteCodec } from '@/modules/codec';
import { WikiLinkResolver } from '@/modules/resolver';
import { PropertiesBanner } from '@/components/properties/PropertiesBanner';
import { DraftEditor } from '@/components/editor/DraftEditor';
import { FileNode, OpenTab } from '@/types';
import { normalizePath, getFilename, getBasename, getDirname, joinPath } from '@/utils/path';
import { TabBar } from './TabBar';
import { ExplorerView, FileTreeOperations } from './ExplorerView';
import { SearchPanel } from './SearchPanel';
import { TagsPanel } from './TagsPanel';
import { QuickOpenModal } from './QuickOpenModal';

export const WorkspaceShell: React.FC = () => {
  // Storage adapter initialization
  const [storage] = useState<FileSystemPort>(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return new ElectronIpcAdapter();
    }
    return new InMemoryFsAdapter({
      'notes/Welcome.md': `---
title: Welcome to DraftBridge
tags: [getting-started, documentation]
status: published
---
# Welcome to DraftBridge!

DraftBridge is a **markdown reader and writer** built specifically for people who want connected notes without learning raw markdown syntax.

## What you can do:
- Format text with the floating toolbar (select any text)
- Type '/' on a blank line to insert headings, lists, tables, and tasks
- Link to another note by typing '[[' — try clicking [[Second Note]]!
- Add tags anywhere in text like #ideas or in the **Properties Banner** above
- Everything automatically saves as standard, portable Markdown on your disk.
`,
      'notes/Second Note.md': `---
title: Second Note
tags: [ideas]
---
# Second Note

This note is connected from [[Welcome]] via a wiki-link!
Try adding your own notes in the sidebar.
`,
    });
  });

  const [resolver] = useState(() => new WikiLinkResolver());

  // Workspace state
  const [workspaceMode, setWorkspaceMode] = useState<'folder' | 'file'>('folder');
  const [workspacePath, setWorkspacePath] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return null;
    }
    return 'notes';
  });
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'files' | 'search' | 'tags'>('files');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [quickOpen, setQuickOpen] = useState(false);

  // Tabs & Active document
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabIdx, setActiveTabIdx] = useState<number>(-1);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  const activeTab = activeTabIdx >= 0 ? tabs[activeTabIdx] : null;

  // Effective path to watch and index (workspace folder or active single file's parent directory)
  const effectiveWatchPath = workspacePath || (activeTab ? getDirname(activeTab.path) : null);

  // Refresh file tree & update resolver index
  const refreshWorkspace = useCallback(async () => {
    if (!effectiveWatchPath) return;
    try {
      const tree = await storage.listTree(effectiveWatchPath);
      if (workspacePath) {
        setFileTree(tree);
      }

      const collected: Array<{ path: string; rawContent: string }> = [];
      const traverse = async (nodes: FileNode[]) => {
        for (const node of nodes) {
          if (node.isDirectory && node.children) {
            await traverse(node.children);
          } else if (!node.isDirectory) {
            try {
              const raw = await storage.readFile(node.path);
              collected.push({ path: node.path, rawContent: raw });
            } catch {}
          }
        }
      };
      await traverse(tree);
      resolver.updateIndex(collected);
    } catch (err) {
      console.error('Failed to list workspace tree', err);
    }
  }, [storage, effectiveWatchPath, workspacePath, resolver]);

  // Initial load & single file change trigger
  useEffect(() => {
    if (effectiveWatchPath) {
      refreshWorkspace();
    }
    if (typeof window !== 'undefined' && !window.electronAPI && tabs.length === 0) {
      const loadDefault = async () => {
        try {
          const raw = await storage.readFile('notes/Welcome.md');
          const parsed = NoteCodec.decode(raw);
          setTabs([
            {
              path: 'notes/Welcome.md',
              name: 'Welcome.md',
              frontmatter: parsed.frontmatter,
              content: parsed.content,
              isDirty: false,
            },
          ]);
          setActiveTabIdx(0);
        } catch {}
      };
      loadDefault();
    }
  }, [refreshWorkspace, storage, effectiveWatchPath, tabs.length]);

  // Live external file watching (workspace folder or active file/directory in single file mode)
  useEffect(() => {
    if (!effectiveWatchPath) return;
    const unsubscribe = storage.watch(effectiveWatchPath, async (changedPath) => {
      await refreshWorkspace();
      if (activeTab && normalizePath(activeTab.path) === normalizePath(changedPath) && !activeTab.isDirty) {
        try {
          const raw = await storage.readFile(changedPath);
          const parsed = NoteCodec.decode(raw);
          setTabs((prev) =>
            prev.map((t, i) =>
              i === activeTabIdx
                ? { ...t, frontmatter: parsed.frontmatter, content: parsed.content, isDirty: false }
                : t
            )
          );
        } catch {}
      }
    });

    return () => {
      unsubscribe();
    };
  }, [effectiveWatchPath, storage, refreshWorkspace, activeTab, activeTabIdx]);

  // Open note in tab
  const openNote = async (filePath: string) => {
    const existingIdx = tabs.findIndex((t) => normalizePath(t.path) === normalizePath(filePath));
    if (existingIdx >= 0) {
      setActiveTabIdx(existingIdx);
      return;
    }

    try {
      const raw = await storage.readFile(filePath);
      const parsed = NoteCodec.decode(raw);
      const filename = getFilename(filePath);

      const newTab: OpenTab = {
        path: filePath,
        name: filename,
        frontmatter: parsed.frontmatter,
        content: parsed.content,
        isDirty: false,
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabIdx(tabs.length);
    } catch (err) {
      console.error('Failed to open note', err);
    }
  };

  // Close tab
  const closeTab = (idxToClose: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = tabs.filter((_, i) => i !== idxToClose);
    setTabs(remaining);
    if (activeTabIdx === idxToClose) {
      setActiveTabIdx(remaining.length > 0 ? Math.max(0, idxToClose - 1) : -1);
    } else if (activeTabIdx > idxToClose) {
      setActiveTabIdx(activeTabIdx - 1);
    }
  };

  // Force Save (Immediate)
  const forceSave = useCallback(async () => {
    if (!activeTab) return;
    setSaveStatus('saving');
    try {
      const encoded = NoteCodec.encode(activeTab.frontmatter, activeTab.content);
      await storage.writeFile(activeTab.path, encoded);
      setSaveStatus('saved');
      setTabs((prev) =>
        prev.map((t, i) => (i === activeTabIdx ? { ...t, isDirty: false } : t))
      );
      refreshWorkspace();
    } catch (err) {
      console.error('Save failed', err);
    }
  }, [activeTab, activeTabIdx, storage, refreshWorkspace]);

  // Debounced auto-save
  useEffect(() => {
    if (!activeTab || !activeTab.isDirty) return;
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      forceSave();
    }, 500);

    return () => clearTimeout(timer);
  }, [activeTab?.content, activeTab?.frontmatter, activeTab?.isDirty, forceSave]);

  // Update active note content
  const handleContentChange = (newMarkdown: string) => {
    if (activeTabIdx < 0) return;
    setTabs((prev) =>
      prev.map((t, i) =>
        i === activeTabIdx ? { ...t, content: newMarkdown, isDirty: true } : t
      )
    );
  };

  // Update active note frontmatter
  const handleFrontmatterChange = (newFrontmatter: Record<string, any>) => {
    if (activeTabIdx < 0) return;
    setTabs((prev) =>
      prev.map((t, i) =>
        i === activeTabIdx ? { ...t, frontmatter: newFrontmatter, isDirty: true } : t
      )
    );
  };

  // Open folder dialog
  const handleOpenFolder = useCallback(async () => {
    const selected = await storage.openDialog('folder');
    if (selected) {
      setWorkspaceMode('folder');
      setWorkspacePath(selected);
      setTabs([]);
      setActiveTabIdx(-1);
      setSidebarOpen(true);
    }
  }, [storage]);

  // Open single file dialog (distraction-free single document mode per Spec line 24 & line 33)
  const handleOpenFile = async () => {
    const selected = await storage.openDialog('file');
    if (selected) {
      setWorkspaceMode('file');
      setWorkspacePath(null);
      setSidebarOpen(false);
      await openNote(selected);
    }
  };

  // Create new note
  const handleCreateNote = async () => {
    let targetFolder = workspacePath;
    if (!targetFolder) {
      const picked = await storage.openDialog('folder');
      if (!picked) return;
      targetFolder = picked;
      setWorkspacePath(picked);
    }

    const title = prompt('Enter note name:');
    if (!title) return;
    const cleanTitle = getBasename(title);
    const filename = `${cleanTitle}.md`;
    const fullPath = joinPath(targetFolder, filename);

    const initialContent = NoteCodec.encode({ title: cleanTitle, tags: [] }, `# ${cleanTitle}\n\n`);
    try {
      await storage.createFile(fullPath, initialContent);
      await refreshWorkspace();
      await openNote(fullPath);
    } catch (err) {
      alert(`Could not create file: ${err}`);
    }
  };

  // Create new folder
  const handleCreateFolder = async () => {
    let targetFolder = workspacePath;
    if (!targetFolder) {
      const picked = await storage.openDialog('folder');
      if (!picked) return;
      targetFolder = picked;
      setWorkspacePath(picked);
    }

    const folderName = prompt('Enter folder name:');
    if (!folderName) return;
    const fullPath = joinPath(targetFolder, folderName.trim());
    try {
      await storage.createFolder(fullPath);
      await refreshWorkspace();
    } catch (err) {
      alert(`Could not create folder: ${err}`);
    }
  };

  // Rename file or folder (cascading to open tabs)
  const handleRenameFile = async (oldPath: string, newPath: string) => {
    try {
      await storage.renameFile(oldPath, newPath);
      const normOld = normalizePath(oldPath);
      const normNew = normalizePath(newPath);
      const oldPrefix = `${normOld}/`;

      setTabs((prev) =>
        prev.map((t) => {
          const normTabPath = normalizePath(t.path);
          if (normTabPath === normOld) {
            return { ...t, path: newPath, name: getFilename(newPath) };
          }
          if (normTabPath.startsWith(oldPrefix)) {
            const updated = `${normNew}/${normTabPath.slice(oldPrefix.length)}`;
            return { ...t, path: updated, name: getFilename(updated) };
          }
          return t;
        })
      );
      await refreshWorkspace();
    } catch (err) {
      alert(`Could not rename: ${err}`);
    }
  };

  // Delete file or folder (cascading to open tabs)
  const handleDeleteFile = async (filePath: string) => {
    try {
      await storage.deleteFile(filePath);
      const normTarget = normalizePath(filePath);
      const targetPrefix = `${normTarget}/`;

      setTabs((prev) =>
        prev.filter((t) => {
          const normTabPath = normalizePath(t.path);
          return normTabPath !== normTarget && !normTabPath.startsWith(targetPrefix);
        })
      );
      await refreshWorkspace();
    } catch (err) {
      alert(`Could not delete: ${err}`);
    }
  };

  // Handle clicking a [[wiki-link]]
  const handleWikiLinkClick = async (target: string) => {
    const resolution = resolver.resolveLink(target, activeTab?.path);
    if (resolution.status === 'exists') {
      await openNote(resolution.targetPath);
    } else {
      let targetFolder = workspacePath;
      if (!targetFolder && activeTab) {
        targetFolder = getDirname(activeTab.path);
      }
      if (!targetFolder) {
        const picked = await storage.openDialog('folder');
        if (!picked) return;
        targetFolder = picked;
        setWorkspacePath(picked);
      }

      const newPath = joinPath(targetFolder, resolution.suggestedPath);
      const initialContent = NoteCodec.encode({ title: target, tags: [] }, `# ${target}\n\n`);
      try {
        await storage.createFile(newPath, initialContent);
        await refreshWorkspace();
        await openNote(newPath);
      } catch {
        alert(`Could not create linked note ${target}`);
      }
    }
  };

  // Handle clicking a #tag
  const handleTagClick = (tag: string) => {
    setSelectedTagFilter(tag);
    setSidebarTab('tags');
    setSidebarOpen(true);
  };

  // Desktop Global Shortcuts (Ctrl+S, Ctrl+O, Ctrl+P, Ctrl+B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? e.metaKey : e.ctrlKey;

      if (!mod) return;

      const key = e.key.toLowerCase();
      if (key === 's') {
        e.preventDefault();
        forceSave();
      } else if (key === 'o') {
        e.preventDefault();
        handleOpenFolder();
      } else if (key === 'p') {
        e.preventDefault();
        setQuickOpen(true);
      } else if (key === 'b') {
        e.preventDefault();
        setSidebarOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [forceSave, handleOpenFolder]);

  // Filtered tags and search
  const tagsSummary = useMemo(() => resolver.searchTags(), [resolver, fileTree]);
  const searchResults = useMemo(() => resolver.searchNotes(searchQuery), [resolver, searchQuery]);
  const allWorkspaceNotes = useMemo(() => resolver.searchNotes(''), [resolver, fileTree]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Activity Bar */}
      <div className="flex w-12 flex-col items-center justify-between border-r border-slate-800/80 bg-slate-950 py-3 select-none">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => {
              setSidebarTab('files');
              setSidebarOpen(true);
            }}
            className={`rounded-lg p-2 transition-colors ${
              sidebarOpen && sidebarTab === 'files'
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
            title="Explorer (Files)"
          >
            <FolderOpen className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setSidebarTab('search');
              setSidebarOpen(true);
            }}
            className={`rounded-lg p-2 transition-colors ${
              sidebarOpen && sidebarTab === 'search'
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
            title="Search Notes"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setSidebarTab('tags');
              setSidebarOpen(true);
            }}
            className={`rounded-lg p-2 transition-colors ${
              sidebarOpen && sidebarTab === 'tags'
                ? 'bg-indigo-600/20 text-indigo-400'
                : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
            }`}
            title="Tags Browser"
          >
            <Tag className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-500 hover:text-slate-300 p-2 transition-colors"
          title="Toggle Sidebar (Ctrl+B)"
        >
          {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Collapsible Sidebar */}
      {sidebarOpen && (
        <div className="flex w-64 flex-col border-r border-slate-800/80 bg-slate-900/60 select-none">
          {/* Header */}
          <div className="flex h-10 items-center justify-between px-3 border-b border-slate-800/80">
            <span
              className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate max-w-[170px]"
              title={workspacePath || 'Explorer'}
            >
              {sidebarTab === 'files'
                ? workspacePath
                  ? getFilename(workspacePath) || 'Files'
                  : 'No Folder'
                : sidebarTab === 'search'
                ? 'Search'
                : 'Tags'}
            </span>
            {sidebarTab === 'files' && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCreateNote}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  title="New Note"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  title="New Folder"
                >
                  <FolderPlus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-2 text-sm">
            {sidebarTab === 'files' && (
              <ExplorerView
                workspacePath={workspacePath}
                fileTree={fileTree}
                activeFilePath={activeTab?.path}
                operations={{
                  onOpenNode: openNote,
                  onRenameNode: handleRenameFile,
                  onDeleteNode: handleDeleteFile,
                }}
                onOpenFolderDialog={handleOpenFolder}
                onCreateNote={handleCreateNote}
                onCreateFolder={handleCreateFolder}
              />
            )}

            {sidebarTab === 'search' && (
              <SearchPanel
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                results={searchResults}
                onSelectNote={openNote}
              />
            )}

            {sidebarTab === 'tags' && (
              <TagsPanel
                tagsSummary={tagsSummary}
                selectedTagFilter={selectedTagFilter}
                onSelectTag={setSelectedTagFilter}
                onOpenNote={openNote}
              />
            )}
          </div>

          {/* Footer Actions */}
          <div className="border-t border-slate-800/80 p-2 text-xs space-y-1">
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-left transition-colors"
              title="Open Folder (Ctrl+O)"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Open Folder...
            </button>
            <button
              onClick={handleOpenFile}
              className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-left transition-colors"
            >
              <FileText className="h-3.5 w-3.5" />
              Open Single File...
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-slate-950">
        {/* Tab Bar Component */}
        <TabBar
          tabs={tabs}
          activeTabIdx={activeTabIdx}
          saveStatus={saveStatus}
          onSelectTab={setActiveTabIdx}
          onCloseTab={closeTab}
        />

        {/* Editor Workspace Canvas */}
        <div className="flex-1 overflow-y-auto px-12 py-8 max-w-4xl mx-auto w-full">
          {activeTab ? (
            <div>
              {/* Properties Banner */}
              <PropertiesBanner
                frontmatter={activeTab.frontmatter}
                onChange={handleFrontmatterChange}
                onTagClick={handleTagClick}
              />

              {/* TipTap WYSIWYG Editor */}
              <DraftEditor
                initialMarkdown={activeTab.content}
                onChange={handleContentChange}
                onWikiLinkClick={handleWikiLinkClick}
                onTagClick={handleTagClick}
                onResolveWikiSuggestions={(q) => resolver.searchNotes(q)}
              />
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500 py-32">
              <FileText className="h-12 w-12 text-slate-700 mb-3" />
              <h3 className="text-base font-semibold text-slate-300">No note opened</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1 mb-4">
                Select a note from explorer, open a workspace folder, or press Ctrl+P to find a note.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCreateNote}
                  className="rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors shadow-sm"
                >
                  Create Note
                </button>
                <button
                  onClick={handleOpenFolder}
                  className="rounded-md border border-slate-700 px-3.5 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Open Folder
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Open Modal (Ctrl+P) */}
      <QuickOpenModal
        isOpen={quickOpen}
        onClose={() => setQuickOpen(false)}
        notes={allWorkspaceNotes}
        onSelectNote={openNote}
      />
    </div>
  );
};
