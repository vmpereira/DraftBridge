import { useCallback } from 'react';
import { FileSystemPort } from '@/modules/storage/port';
import { NoteCodec } from '@/modules/codec';
import { OpenTab } from '@/types';
import { normalizePath, getFilename, getBasename, joinPath } from '@/utils/path';

export interface UseWorkspaceOperationsParams {
  storage: FileSystemPort;
  workspacePath: string | null;
  setWorkspacePath: (path: string | null) => void;
  setTabs: React.Dispatch<React.SetStateAction<OpenTab[]>>;
  refreshWorkspace: () => Promise<void>;
  openNote: (path: string) => Promise<void>;
}

export function useWorkspaceOperations({
  storage,
  workspacePath,
  setWorkspacePath,
  setTabs,
  refreshWorkspace,
  openNote,
}: UseWorkspaceOperationsParams) {
  // Create new note
  const handleCreateNote = useCallback(async () => {
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
  }, [storage, workspacePath, setWorkspacePath, refreshWorkspace, openNote]);

  // Create new folder
  const handleCreateFolder = useCallback(async () => {
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
  }, [storage, workspacePath, setWorkspacePath, refreshWorkspace]);

  // Rename file or folder (cascading to open tabs)
  const handleRenameFile = useCallback(
    async (oldPath: string, newPath: string) => {
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
    },
    [storage, setTabs, refreshWorkspace]
  );

  // Delete file or folder (cascading to open tabs)
  const handleDeleteFile = useCallback(
    async (filePath: string) => {
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
    },
    [storage, setTabs, refreshWorkspace]
  );

  return {
    handleCreateNote,
    handleCreateFolder,
    handleRenameFile,
    handleDeleteFile,
  };
}
