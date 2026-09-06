# DraftBridge: Desktop Markdown Reader & Writer Base Architecture

**Status**: Ready for Implementation  
**Triage Label**: `ready-for-agent`  
**Target Platform**: Desktop (Windows, macOS, Linux) via Electron + Next.js App Router  

---

## Problem Statement

Markdown is the standard format for modern note-taking, technical documentation, and personal knowledge graphs, but its raw syntax (`#`, `**`, `[text](url)`, `---`) intimidates and distracts non-technical writers. Everyday users who want the benefits of a connected personal knowledge management system (like Obsidian)—such as bi-directional wiki-linking (`[[topic]]`), `#tags`, and YAML metadata—are forced to memorize markup symbols, deal with finicky formatting errors, and navigate complex developer tools. Conversely, mainstream rich-text editors (like Google Docs or Word) lock user content into proprietary silos without accessible plain text, portable files, or flexible inter-note linking.

## Solution

DraftBridge is a native desktop application built with Electron, Next.js, and React that provides a seamless, distraction-free WYSIWYG editing canvas (Notion / Typora style) for users who do not know Markdown syntax, while transparently persisting and reading standard, portable Markdown files on the local filesystem. 

DraftBridge offers:
1. **Seamless WYSIWYG Editing**: Users format text with bold, italics, headings, lists, tables, and callouts using standard visual keyboard shortcuts, a floating contextual selection toolbar, or a slash command (`/`) menu—without ever seeing raw markdown tags unless they want to.
2. **Visual YAML Metadata Banner**: A form-based properties header at the top of each note (Notion/Obsidian style) that cleanly renders and modifies tags, creation dates, and custom key-value pairs while serializing to/from standard `---` YAML frontmatter.
3. **Obsidian-Style Wiki-Links (`[[topic]]`)**: Typing `[[` summons an instant autocomplete menu of existing notes. Clicking a wiki-link navigates directly to that note or automatically creates it if it doesn't exist yet.
4. **Bi-directional `#Tags`**: `#tags` typed in body text render as interactive badge pills, synchronize with the frontmatter properties banner, and allow immediate filtering of related notes across the workspace.
5. **Flexible Workspace Modes**:
   - **Folder Mode (VS Code Style)**: Opens a folder/vault with a collapsible File Explorer tree, multi-file tab navigation, search, and a tag browser.
   - **Single File Mode**: Opens an individual `.md` file in a focused, distraction-free single-document canvas.
6. **Robust Auto-Save & File Sync**: Changes debounce-save to disk automatically, and external changes from other applications are detected and reloaded seamlessly.

---

## User Stories

### Project & File Management
1. As a user, I want to open an entire folder as a workspace, so that I can manage a collection of interconnected notes like in VS Code or Obsidian.
2. As a user, I want to open a single standalone Markdown file, so that I can quickly view and edit notes without having to load a parent directory.
3. As a user, I want to see a nested file tree in the sidebar when a folder is open, so that I can easily navigate subfolders and documents.
4. As a user, I want to create, rename, and delete files and folders from the sidebar, so that I can organize my notes directly within the app.
5. As a user, I want to open multiple notes in tabs across the top of the editor in Folder mode, so that I can quickly switch between different pieces of writing.
6. As a user, I want my edits to automatically save to disk after I stop typing, so that I never lose work even if the application closes unexpectedly.
7. As a user, I want an explicit visual indicator showing whether my note is "Saved" or "Saving...", so that I have peace of mind regarding data persistence.
8. As a user, I want external modifications to an open file (e.g. from git or cloud sync) to automatically refresh in the editor, so that I am always viewing the current state.

### WYSIWYG Rich-Text Editing
9. As a non-technical writer, I want to see styled headings, bold text, italics, and lists immediately on the screen, so that I don't have to decipher `#`, `*`, or `_` symbols.
10. As a user, I want a floating formatting bubble toolbar to appear when I select text, so that I can quickly apply bold, italics, strikethrough, code, or links without memorizing shortcuts.
11. As a user, I want to type `/` at the start of a blank line to open a block inserter menu, so that I can easily insert headings, bulleted lists, numbered lists, task checkboxes, callouts, tables, and dividers.
12. As a user, I want to check and uncheck task items with a single mouse click, so that I can manage action items interactively.
13. As a user, I want to copy and paste rich text from web pages or external documents, so that it cleanly converts into styled content and saves as standard Markdown without broken HTML.

### Wiki-Links (`[[topic]]`)
14. As a writer, I want to type `[[` anywhere in my document, so that an autocomplete popup appears showing matching notes in my current workspace.
15. As a writer, I want to filter the note autocomplete list as I type characters following `[[`, so that I can quickly find the exact target note.
16. As a writer, I want pressing Enter on an autocomplete suggestion to insert a formatted `[[topic]]` link pill, so that my document stays visually clean and structured.
17. As a reader, I want to click on a `[[topic]]` link, so that the linked note opens immediately in the active editor tab.
18. As a writer, I want clicking a `[[topic]]` link for a non-existent note to automatically create `topic.md` and open it, so that I can build out ideas fluidly without manual file creation steps.
19. As a user in Single File mode, I want `[[topic]]` links to look for matching files in the same directory as the open document, so that relative note linking still works without an entire project vault.

### `#Tags` & Metadata
20. As a writer, I want typing `#` followed by text to render as an interactive tag pill, so that my tags stand out clearly from ordinary text.
21. As a researcher, I want to click any `#tag` in the note body, so that the application searches and highlights all notes in my workspace tagged with that keyword.
22. As a user, I want to view a visual Properties banner at the top of the note, so that I can inspect and edit document metadata without editing raw YAML headers.
23. As a user, I want to add new metadata fields (such as text, date, numbers, or tag lists) in the Properties banner, so that my note has structured attributes.
24. As a user, I want tags added in the YAML Properties banner and tags typed in the document body to be recognized interchangeably across the workspace, so that my classification is unified.
25. As a user, I want the editor to preserve custom or unfamiliar YAML frontmatter fields untouched when saving, so that integrations with external tools are never corrupted.

---

## Implementation Decisions

### Architectural Topology
- **Electron + Next.js Hybrid**: Electron serves as the host runtime and window container. The frontend is built with Next.js (App Router) configured for static export (`output: 'export'`), producing static HTML/JS/CSS assets loaded by the Electron `BrowserWindow` via `file://` or custom protocol.
- **IPC Seam for Native Capabilities**: No Node.js HTTP server runs inside Electron. All filesystem access, file dialogs, path resolutions, and directory watching are routed through a strongly-typed Electron IPC bridge (`contextBridge.exposeInMainWorld`).

### Core Modules & Interfaces

#### 1. FileSystem Engine (Electron Main Process)
- **Role**: Secure, local filesystem operations.
- **Responsibilities**:
  - Open file/folder native OS dialogs.
  - Read file text and write file text atomically.
  - Read directory recursively with file type classification (`.md` filtering, subfolder trees).
  - Watch active directory or active file using a native file watcher, debouncing change notifications back to the renderer via IPC.

#### 2. Note Serialization Engine (Renderer Process)
- **Role**: Bi-directional translation between disk-stored Markdown text and in-memory editor states.
- **Responsibilities**:
  - Parse raw file text into YAML frontmatter object and body markdown text.
  - Serialize edited frontmatter object and TipTap HTML/Markdown back into clean, formatted `.md` text with valid `---` YAML headers.
  - Parse and normalize `[[wiki-link]]` tokens and `#tags` into TipTap node marks/decorations.

#### 3. TipTap WYSIWYG Editor Core (Renderer Process)
- **Role**: Notion-style rich-text canvas.
- **Extensions**:
  - Custom `WikiLink` inline node with suggestion plugin listening for `[[`.
  - Custom `Tag` inline mark/node recognizing `#word`.
  - Slash command extension listening for `/` on empty blocks.
  - Standard typography, tables, task lists, code blocks, and blockquotes.
  - Floating Bubble Menu for highlighted text selections.

#### 4. Workspace & Tab State Manager
- **Role**: Global application state.
- **Responsibilities**:
  - Track current workspace mode (`folder` vs `file`).
  - Maintain list of open tabs, active tab index, and dirty/saving states.
  - Cache workspace file index (titles, paths, tags) to power fast `[[` wiki-link autocompletions and tag search.

#### 5. Visual Properties Banner
- **Role**: Form-based metadata controller.
- **Responsibilities**:
  - Renders top-of-note property rows: `Tags` (multi-select pill chip input), `Created/Updated` date, and dynamic custom key-value pairs.
  - Two-way bound to the active note's frontmatter state.

---

## Testing Decisions

### Guiding Principles
- **Test External Behavior, Never Internals**: Tests will verify that user actions (opening files, typing text, inserting links, changing properties) result in correct disk files, navigation events, and visual updates, without binding to internal component states or private helper functions.

### Testing Seams

#### Seam 1: Note Serialization & Parsing (Highest Priority Unit Seam)
- **What is tested**: Given a raw Markdown file string containing YAML frontmatter, `[[links]]`, and `#tags`, verify that the parser extracts accurate metadata and rich-text nodes. Verify that the serializer outputs compliant Markdown with preserved YAML frontmatter without syntax corruption.
- **Seam**: Pure functional interface `(rawMarkdown: string) => { metadata: Record<string, any>, content: string }` and `(metadata, content) => rawMarkdown`.

#### Seam 2: Wiki-Link Resolution & Indexing (Integration Seam)
- **What is tested**: Given an index of files in a mock folder, verify that resolving `[[topic]]` correctly finds `topic.md`, handles case insensitivity, resolves nested paths, and flags non-existent topics for creation.
- **Seam**: Workspace index query interface `(query: string, workspaceFiles: FileEntry[]) => SearchResult[]`.

#### Seam 3: Electron IPC Bridge Contract (Integration Seam)
- **What is tested**: Verify that the preload API exposes the required asynchronous signatures and that requests to read, write, and list files return expected data structures.

---

## Out of Scope

The following features are intentionally out of scope for this base version:
1. Cloud synchronization or multi-user real-time collaborative editing (DraftBridge is strictly local-first).
2. Canvas / Infinite whiteboard graph visualization (Obsidian 2D Graph view will be a separate milestone).
3. Third-party community plugin marketplace.
4. Mobile apps (iOS / Android).
5. PDF / ePub publication compiler.

---

## Further Notes

- **Keyboard Shortcut Standards**: Standard desktop conventions must be respected:
  - `Ctrl+S` / `Cmd+S`: Force save.
  - `Ctrl+O` / `Cmd+O`: Open file or folder dialog.
  - `Ctrl+P` / `Cmd+P`: Quick open note switcher.
  - `Ctrl+B` / `Cmd+B`: Bold text / Toggle sidebar.
- **Theme Support**: Clean dark and light mode palette adhering to the `frontend-design` aesthetic guidelines.
