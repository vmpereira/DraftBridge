'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Markdown } from 'tiptap-markdown';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Quote,
  Table as TableIcon,
  Link as LinkIcon,
  Minus,
} from 'lucide-react';

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { NoteCodec } from '@/modules/codec';

const WikiLinkDecorationExtension = Extension.create({
  name: 'wikiLinkDecorations',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('wikiLinkDecorations'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            const wikiRegex = /\[\[([^\[\]|\n]+)(?:\|([^\[\]|\n]+))?\]\]/g;
            const tagRegex = /(?:^|\s)(#[a-zA-Z0-9_\-]+(?:\/[a-zA-Z0-9_\-]+)*)(?=\s|$|[.,;:!?])/g;

            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return;

              let match;
              while ((match = wikiRegex.exec(node.text)) !== null) {
                const start = pos + match.index;
                const end = start + match[0].length;
                const target = match[1].trim();
                decorations.push(
                  Decoration.inline(start, end, {
                    class: 'wiki-link cursor-pointer text-indigo-400 bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-700/60 hover:bg-indigo-900/90 hover:text-indigo-200 font-medium transition-all shadow-sm select-none',
                    'data-target': target,
                    title: `Click to go to [[${target}]]`,
                  })
                );
              }

              while ((match = tagRegex.exec(node.text)) !== null) {
                const fullMatch = match[0];
                const tagWithHash = match[1];
                const offset = fullMatch.indexOf(tagWithHash);
                const start = pos + match.index + offset;
                const end = start + tagWithHash.length;
                const tag = tagWithHash.replace(/^#/, '');
                decorations.push(
                  Decoration.inline(start, end, {
                    class: 'tag-pill cursor-pointer text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded-full border border-indigo-500/40 hover:underline transition-all select-none',
                    'data-tag': tag,
                    title: `Filter by #${tag}`,
                  })
                );
              }
            });

            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

interface DraftEditorProps {
  initialMarkdown: string;
  onChange: (markdown: string) => void;
  onWikiLinkClick?: (target: string) => void;
  onTagClick?: (tag: string) => void;
  onResolveWikiSuggestions?: (query: string) => Array<{ title: string; path: string }>;
}

export const DraftEditor: React.FC<DraftEditorProps> = ({
  initialMarkdown,
  onChange,
  onWikiLinkClick,
  onTagClick,
  onResolveWikiSuggestions,
}) => {
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });

  const [wikiSuggestOpen, setWikiSuggestOpen] = useState(false);
  const [wikiSuggestPos, setWikiSuggestPos] = useState({ top: 0, left: 0 });
  const [wikiQuery, setWikiQuery] = useState('');
  const [wikiSuggestions, setWikiSuggestions] = useState<Array<{ title: string; path: string }>>([]);
  const [selectedSuggestIdx, setSelectedSuggestIdx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: 'rounded-md bg-slate-950 p-4 font-mono text-sm' } },
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands, or '[[' to link a note...",
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      WikiLinkDecorationExtension,
      Markdown.configure({
        html: false,
        transformPastedText: true,
      }),
    ],
    content: initialMarkdown,
    editorProps: {
      attributes: {
        class: 'focus:outline-none max-w-none text-slate-100',
      },
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        // 1. Check DOM decoration element
        const linkEl = target.classList.contains('wiki-link') ? target : target.closest('.wiki-link');
        if (linkEl) {
          const linkTarget = linkEl.getAttribute('data-target');
          if (linkTarget && onWikiLinkClick) {
            event.preventDefault();
            event.stopPropagation();
            onWikiLinkClick(linkTarget);
            return true;
          }
        }

        const tagEl = target.classList.contains('tag-pill') ? target : target.closest('.tag-pill');
        if (tagEl) {
          const tag = tagEl.getAttribute('data-tag');
          if (tag && onTagClick) {
            event.preventDefault();
            event.stopPropagation();
            onTagClick(tag);
            return true;
          }
        }

        // 2. ProseMirror document offset fallback
        try {
          const $pos = view.state.doc.resolve(pos);
          const parentText = $pos.parent.textBetween(0, $pos.parent.content.size);
          const linkTarget = NoteCodec.findWikiLinkAt(parentText, $pos.parentOffset);
          if (linkTarget && onWikiLinkClick) {
            event.preventDefault();
            event.stopPropagation();
            onWikiLinkClick(linkTarget);
            return true;
          }

          const tag = NoteCodec.findTagAt(parentText, $pos.parentOffset);
          if (tag && onTagClick) {
            event.preventDefault();
            event.stopPropagation();
            onTagClick(tag);
            return true;
          }
        } catch {}

        return false;
      },
    },
    onUpdate: ({ editor }) => {
      // Export markdown
      const md = (editor.storage as any).markdown?.getMarkdown() ?? editor.getHTML();
      onChange(md);

      // Check cursor context for Slash Command ('/') or Wiki Link ('[[')
      const { selection } = editor.state;
      const { $from } = selection;
      const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '\ufffc');

      // Check [[
      const wikiMatch = textBefore.match(/\[\[([^\[\]]*)$/);
      if (wikiMatch) {
        const q = wikiMatch[1];
        setWikiQuery(q);
        const matches = onResolveWikiSuggestions ? onResolveWikiSuggestions(q) : [];
        setWikiSuggestions(matches);
        setSelectedSuggestIdx(0);

        // Get coordinates for popup
        const coords = editor.view.coordsAtPos(selection.from);
        setWikiSuggestPos({ top: coords.bottom + 8, left: coords.left });
        setWikiSuggestOpen(true);
        setSlashMenuOpen(false);
      } else {
        setWikiSuggestOpen(false);

        // Check '/' strictly at start of empty line
        if (textBefore === '/') {
          const coords = editor.view.coordsAtPos(selection.from);
          setSlashMenuPos({ top: coords.bottom + 8, left: coords.left });
          setSlashTriggerPos(selection.from);
          setSlashMenuOpen(true);
        } else {
          setSlashMenuOpen(false);
          setSlashTriggerPos(null);
        }
      }
    },
  });

  const [slashTriggerPos, setSlashTriggerPos] = useState<number | null>(null);

  // Helper to execute slash menu item cleanly
  const runSlashCommand = (action: () => void) => {
    if (!editor) return;
    const targetPos = slashTriggerPos ?? editor.state.selection.from;
    const charBefore = editor.state.doc.textBetween(Math.max(0, targetPos - 1), targetPos);
    
    const chain = editor.chain().focus();
    if (charBefore === '/') {
      chain.deleteRange({
        from: Math.max(0, targetPos - 1),
        to: targetPos,
      });
    }
    chain.run();
    action();
    setSlashMenuOpen(false);
    setSlashTriggerPos(null);
  };

  // Keep content in sync when opening different files
  useEffect(() => {
    if (!editor) return;
    const currentMd = (editor.storage as any).markdown?.getMarkdown() ?? '';
    if (currentMd !== initialMarkdown) {
      editor.commands.setContent(initialMarkdown);
    }
  }, [initialMarkdown, editor]);

  // Handle inserting wiki-link from popup
  const insertWikiLink = (title: string) => {
    if (!editor) return;
    const { selection } = editor.state;
    const { $from } = selection;
    const textBefore = $from.parent.textBetween(0, $from.parentOffset);
    const match = textBefore.match(/\[\[([^\[\]]*)$/);
    if (match) {
      const matchStart = selection.from - match[0].length;
      editor
        .chain()
        .focus()
        .deleteRange({ from: matchStart, to: selection.from })
        .insertContent(`[[${title}]] `)
        .run();
    }
    setWikiSuggestOpen(false);
  };

  // Keyboard navigation for suggestions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!wikiSuggestOpen || wikiSuggestions.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestIdx((prev) => (prev + 1) % wikiSuggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestIdx((prev) => (prev - 1 + wikiSuggestions.length) % wikiSuggestions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        insertWikiLink(wikiSuggestions[selectedSuggestIdx].title);
      } else if (e.key === 'Escape') {
        setWikiSuggestOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [wikiSuggestOpen, wikiSuggestions, selectedSuggestIdx]);

  if (!editor) return null;

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Floating Selection Bubble Menu */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 150 }}
        className="flex items-center gap-0.5 rounded-lg border border-slate-700 bg-slate-900/95 p-1 shadow-xl backdrop-blur-sm"
      >
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('bold') ? 'text-indigo-400 bg-slate-800' : 'text-slate-300'}`}
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('italic') ? 'text-indigo-400 bg-slate-800' : 'text-slate-300'}`}
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('strike') ? 'text-indigo-400 bg-slate-800' : 'text-slate-300'}`}
          title="Strikethrough"
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('code') ? 'text-indigo-400 bg-slate-800' : 'text-slate-300'}`}
          title="Inline Code"
        >
          <Code className="h-4 w-4" />
        </button>
        <div className="h-4 w-px bg-slate-700 mx-1" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('heading', { level: 1 }) ? 'text-indigo-400 bg-slate-800' : 'text-slate-300'}`}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded hover:bg-slate-800 ${editor.isActive('heading', { level: 2 }) ? 'text-indigo-400 bg-slate-800' : 'text-slate-300'}`}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </button>
      </BubbleMenu>

      {/* Editor Main Canvas */}
      <EditorContent editor={editor} className="outline-none" />

      {/* Slash Menu Inserter Popup */}
      {slashMenuOpen && (
        <div
          style={{ top: `${slashMenuPos.top}px`, left: `${slashMenuPos.left}px` }}
          className="fixed z-50 w-56 rounded-lg border border-slate-700 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-md"
        >
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Basic Blocks
          </div>
          <button
            onClick={() => runSlashCommand(() => editor.chain().focus().toggleHeading({ level: 1 }).run())}
            className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 text-left transition-colors"
          >
            <Heading1 className="h-4 w-4 text-indigo-400" />
            <span>Heading 1</span>
          </button>
          <button
            onClick={() => runSlashCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
            className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 text-left transition-colors"
          >
            <Heading2 className="h-4 w-4 text-indigo-400" />
            <span>Heading 2</span>
          </button>
          <button
            onClick={() => runSlashCommand(() => editor.chain().focus().toggleBulletList().run())}
            className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 text-left transition-colors"
          >
            <List className="h-4 w-4 text-indigo-400" />
            <span>Bullet List</span>
          </button>
          <button
            onClick={() => runSlashCommand(() => editor.chain().focus().toggleOrderedList().run())}
            className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 text-left transition-colors"
          >
            <ListOrdered className="h-4 w-4 text-indigo-400" />
            <span>Numbered List</span>
          </button>
          <button
            onClick={() => runSlashCommand(() => editor.chain().focus().toggleTaskList().run())}
            className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 text-left transition-colors"
          >
            <CheckSquare className="h-4 w-4 text-indigo-400" />
            <span>Task Checklist</span>
          </button>
          <button
            onClick={() => runSlashCommand(() => editor.chain().focus().toggleBlockquote().run())}
            className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 text-left transition-colors"
          >
            <Quote className="h-4 w-4 text-indigo-400" />
            <span>Callout / Quote</span>
          </button>
          <button
            onClick={() => runSlashCommand(() => editor.chain().focus().setHorizontalRule().run())}
            className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 text-left transition-colors"
          >
            <Minus className="h-4 w-4 text-indigo-400" />
            <span>Divider</span>
          </button>
          <button
            onClick={() => runSlashCommand(() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run())}
            className="flex items-center gap-2.5 w-full rounded-md px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-800 text-left transition-colors"
          >
            <TableIcon className="h-4 w-4 text-indigo-400" />
            <span>Table</span>
          </button>
        </div>
      )}

      {/* [[ Wiki-link Suggestion Dropdown */}
      {wikiSuggestOpen && (
        <div
          style={{ top: `${wikiSuggestPos.top}px`, left: `${wikiSuggestPos.left}px` }}
          className="fixed z-50 w-64 max-h-60 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900/95 p-1 shadow-2xl backdrop-blur-md"
        >
          <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Link to Note
          </div>
          {wikiSuggestions.length > 0 ? (
            wikiSuggestions.map((item, idx) => (
              <button
                key={item.path}
                onClick={() => insertWikiLink(item.title)}
                className={`flex items-center justify-between w-full rounded-md px-2.5 py-1.5 text-xs text-left transition-colors ${idx === selectedSuggestIdx ? 'bg-indigo-600 text-white' : 'text-slate-200 hover:bg-slate-800'}`}
              >
                <span className="truncate font-medium">{item.title}</span>
                <span className="text-[10px] opacity-60 truncate ml-2">{item.path}</span>
              </button>
            ))
          ) : (
            <button
              onClick={() => insertWikiLink(wikiQuery || 'New Note')}
              className="flex items-center gap-1.5 w-full rounded-md px-2.5 py-2 text-xs text-indigo-300 hover:bg-slate-800 text-left transition-colors"
            >
              <span>Create new note:</span>
              <span className="font-bold underline">[[{wikiQuery || 'New Note'}]]</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
