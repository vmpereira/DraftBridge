'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FolderOpen,
  FileText,
  Search,
  Tag,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  ChevronDown,
  X,
  Save,
  Check,
  PanelLeftClose,
  PanelLeft,
  Folder,
} from 'lucide-react';
import { FileSystemPort } from '@/modules/storage/port';
import { ElectronIpcAdapter } from '@/modules/storage/electron-adapter';
import { MemoryFsAdapter } from '@/modules/storage/memory-adapter';
import { NoteCodec } from '@/modules/codec';
import { WikiLinkResolver } from '@/modules/resolver';
import { PropertiesBanner } from '@/components/properties/PropertiesBanner';
import { DraftEditor } from '@/components/editor/DraftEditor';
import { FileNode } from '@/types';

interface OpenTab {
  path: string;
  name: string;
  frontmatter: Record<string, any>;
  content: string;
  isDirty: boolean;
}

export const WorkspaceShell: React.FC = () => {
  // Initialize storage adapter: Electron if desktop, else in-memory mock with initial demo note
  const [storage] = useState<FileSystemPort>(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return new ElectronIpcAdapter();
    }
    return new MemoryFsAdapter({
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
- Link to another note by typing \`[[\` — try clicking [[Second Note]]!
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

  // Workspace state: null in Electron until a folder is opened; 'notes' in browser mock
  const [workspacePath, setWorkspacePath] = useState<string | null>(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return null;
    }
    return 'notes';
  });
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [sidebarTab, setSidebarTab] = useState<'files' | 'search' | 'tags'>('files');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Tabs & Active document
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabIdx, setActiveTabIdx] = useState<number>(-1);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  const activeTab = activeTabIdx >= 0 ? tabs[activeTabIdx] : null;

  // Refresh file tree & update resolver index
  const refreshWorkspace = useCallback(async () => {
    if (!workspacePath) return;
    try {
      const tree = await storage.listTree(workspacePath);
      setFileTree(tree);

      // Collect all markdown files to index
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
  }, [storage, workspacePath, resolver]);

  // Initial load
  useEffect(() => {
    if (workspacePath) {
      refreshWorkspace();
    }
    // Open default welcome tab ONLY in browser mock mode
    if (typeof window !== 'undefined' && !window.electronAPI) {
      const loadDefault = async () => {
        try {
          const raw = await storage.readFile('Welcome.md');
          const parsed = NoteCodec.decode(raw);
          setTabs([
            {
              path: 'Welcome.md',
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
  }, [refreshWorkspace, storage, workspacePath]);

  // Open note in tab
  const openNote = async (filePath: string) => {
    const existingIdx = tabs.findIndex((t) => t.path === filePath);
    if (existingIdx >= 0) {
      setActiveTabIdx(existingIdx);
      return;
    }

    try {
      const raw = await storage.readFile(filePath);
      const parsed = NoteCodec.decode(raw);
      const filename = filePath.replace(/\\/g, '/').split('/').pop() || filePath;

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

  // Debounced auto-save
  useEffect(() => {
    if (!activeTab || !activeTab.isDirty) return;

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        const encoded = NoteCodec.encode(activeTab.frontmatter, activeTab.content);
        await storage.writeFile(activeTab.path, encoded);
        setSaveStatus('saved');
        setTabs((prev) =>
          prev.map((t, i) => (i === activeTabIdx ? { ...t, isDirty: false } : t))
        );
        refreshWorkspace();
      } catch (err) {
        console.error('Auto-save failed', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [activeTab?.content, activeTab?.frontmatter, activeTab?.isDirty, activeTabIdx, storage, refreshWorkspace]);

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
  const handleOpenFolder = async () => {
    const selected = await storage.openDialog('folder');
    if (selected) {
      setWorkspacePath(selected);
      setTabs([]);
      setActiveTabIdx(-1);
    }
  };

  // Open single file dialog
  const handleOpenFile = async () => {
    const selected = await storage.openDialog('file');
    if (selected) {
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
    const cleanTitle = title.replace(/\.md$/i, '');
    const filename = `${cleanTitle}.md`;
    const fullPath = `${targetFolder}/${filename}`;

    const initialContent = `---\ntitle: ${cleanTitle}\ntags: []\n---\n# ${cleanTitle}\n\n`;
    try {
      await storage.createFile(fullPath, initialContent);
      await refreshWorkspace();
      await openNote(fullPath);
    } catch (err) {
      alert(`Could not create file: ${err}`);
    }
  };

  // Handle clicking a [[wiki-link]]
  const handleWikiLinkClick = async (target: string) => {
    const resolution = resolver.resolveLink(target, activeTab?.path);
    if (resolution.status === 'exists') {
      await openNote(resolution.targetPath);
    } else {
      // Determine destination folder
      let targetFolder = workspacePath;
      if (!targetFolder && activeTab) {
        targetFolder = activeTab.path.replace(/\\/g, '/').split('/').slice(0, -1).join('/');
      }
      if (!targetFolder) {
        const picked = await storage.openDialog('folder');
        if (!picked) return;
        targetFolder = picked;
        setWorkspacePath(picked);
      }

      const newPath = `${targetFolder}/${resolution.suggestedPath}`;
      const initialContent = `---\ntitle: ${target}\ntags: []\n---\n# ${target}\n\n`;
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

  // Filtered tags and search
  const tagsSummary = useMemo(() => resolver.searchTags(), [resolver, fileTree]);
  const searchResults = useMemo(() => resolver.searchNotes(searchQuery), [resolver, searchQuery]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Activity Bar (VS Code style far left) */}
      <div className="flex w-12 flex-col items-center justify-between border-r border-slate-800/80 bg-slate-950 py-3 select-none">
        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => {
              setSidebarTab('files');
              setSidebarOpen(true);
            }}
            className={`rounded-lg p-2 transition-colors ${sidebarTab === 'files' && sidebarOpen ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
            title="Explorer (Files)"
          >
            <FolderOpen className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setSidebarTab('search');
              setSidebarOpen(true);
            }}
            className={`rounded-lg p-2 transition-colors ${sidebarTab === 'search' && sidebarOpen ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
            title="Search Notes"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              setSidebarTab('tags');
              setSidebarOpen(true);
            }}
            className={`rounded-lg p-2 transition-colors ${sidebarTab === 'tags' && sidebarOpen ? 'bg-indigo-600/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}
            title="Tags Browser"
          >
            <Tag className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-slate-500 hover:text-slate-300 p-2"
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
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 truncate max-w-[170px]" title={workspacePath || 'Explorer'}>
              {sidebarTab === 'files'
                ? (workspacePath ? workspacePath.replace(/\\/g, '/').split('/').pop() || 'Files' : 'No Folder')
                : sidebarTab === 'search'
                ? 'Search'
                : 'Tags'}
            </span>
            {sidebarTab === 'files' && (
              <button
                onClick={handleCreateNote}
                className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                title="New Note"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-2 text-sm">
            {sidebarTab === 'files' && (
              <div className="space-y-0.5">
                {!workspacePath ? (
                  <div className="px-3 py-6 text-center">
                    <p className="text-xs text-slate-400 mb-3">No folder opened.</p>
                    <button
                      onClick={handleOpenFolder}
                      className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
                    >
                      Open Folder
                    </button>
                  </div>
                ) : fileTree.length === 0 ? (
                  <div className="px-2 py-4 text-xs text-slate-500 text-center">
                    No notes found. Create a new note to start.
                  </div>
                ) : (
                  fileTree.map((node) => (
                    <div
                      key={node.path}
                      onClick={() => !node.isDirectory && openNote(node.path)}
                      className={`flex items-center gap-2 rounded px-2 py-1 text-xs cursor-pointer transition-colors ${activeTab?.path === node.path ? 'bg-indigo-600/20 text-indigo-300 font-medium' : 'text-slate-300 hover:bg-slate-800/60'}`}
                    >
                      {node.isDirectory ? (
                        <Folder className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      ) : (
                        <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{node.name}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {sidebarTab === 'search' && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Search note title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
                />
                <div className="space-y-1">
                  {searchResults.map((res) => (
                    <div
                      key={res.path}
                      onClick={() => openNote(res.path)}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800/60 cursor-pointer"
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      <div className="truncate">
                        <div className="font-medium truncate">{res.title}</div>
                        <div className="text-[10px] text-slate-500 truncate">{res.path}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sidebarTab === 'tags' && (
              <div className="space-y-1">
                {tagsSummary.map((item) => (
                  <div
                    key={item.tag}
                    onClick={() => setSelectedTagFilter(selectedTagFilter === item.tag ? null : item.tag)}
                    className={`flex items-center justify-between rounded px-2 py-1.5 text-xs cursor-pointer transition-colors ${selectedTagFilter === item.tag ? 'bg-indigo-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-800/60'}`}
                  >
                    <span className="truncate">#{item.tag}</span>
                    <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-400">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions footer */}
          <div className="border-t border-slate-800/80 p-2 text-xs space-y-1">
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 text-left transition-colors"
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
        {/* Tab Bar */}
        <div className="flex h-10 items-center justify-between border-b border-slate-800/80 bg-slate-900/40 px-2 select-none">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((tab, idx) => (
              <div
                key={tab.path}
                onClick={() => setActiveTabIdx(idx)}
                className={`group flex items-center gap-2 rounded-t-md px-3 py-1.5 text-xs font-medium cursor-pointer border-t-2 transition-all ${idx === activeTabIdx ? 'border-indigo-500 bg-slate-950 text-slate-100' : 'border-transparent text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'}`}
              >
                <FileText className="h-3.5 w-3.5 text-slate-500" />
                <span className="truncate max-w-[120px]">{tab.name}</span>
                {tab.isDirty ? (
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                ) : (
                  <button
                    onClick={(e) => closeTab(idx, e)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-300 rounded p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Save Status Badge */}
          <div className="flex items-center gap-2 text-xs text-slate-400 pr-2">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-amber-400 text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-400 text-[11px]">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
          </div>
        </div>

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
                Select a note from the explorer, open a workspace folder, or create a new note.
              </p>
              <button
                onClick={handleCreateNote}
                className="rounded-md bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white hover:bg-indigo-500 transition-colors"
              >
                Create Note
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
