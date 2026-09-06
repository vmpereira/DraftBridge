import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openDialog: (type: 'file' | 'folder') => ipcRenderer.invoke('dialog:open', type),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  createFile: (filePath: string, initialContent?: string) => ipcRenderer.invoke('fs:createFile', filePath, initialContent),
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:deleteFile', filePath),
  renameFile: (oldPath: string, newPath: string) => ipcRenderer.invoke('fs:renameFile', oldPath, newPath),
  listTree: (rootPath: string) => ipcRenderer.invoke('fs:listTree', rootPath),
  onFileChange: (callback: (path: string) => void) => {
    const handler = (_event: any, changedPath: string) => callback(changedPath);
    ipcRenderer.on('fs:changed', handler);
    return () => {
      ipcRenderer.removeListener('fs:changed', handler);
    };
  },
});
