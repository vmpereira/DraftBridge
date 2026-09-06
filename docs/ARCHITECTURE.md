# Architecture Guide

Deep module layout and execution topology.

## Top-Level Topology

1. **Host**: Electron main process (electron/main.ts) manages native windows and IPC channels.
2. **Client**: Next.js App Router static export (output: 'export') in src/app/.
3. **Bridge**: Preload context bridge (electron/preload.ts) exposes typed window.electronAPI.
4. **Storage Seam**: FileSystemPort interface implemented by ElectronIpcAdapter (desktop) and InMemoryFsAdapter (headless tests).

## Deep Modules

- NoteCodec: Serializes and deserializes .md files to/from frontmatter and ProseMirror nodes.
- WikiLinkResolver: In-memory workspace note and tag graph index for [[ autocompletions and link routing.
