import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import chokidar, { type FSWatcher } from 'chokidar';

let mainWindow: BrowserWindow | null = null;
let watcher: FSWatcher | null = null;

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    await mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
        mainWindow?.webContents.toggleDevTools();
        event.preventDefault();
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (watcher) watcher.close();
  });
}

// IPC Handlers
ipcMain.handle('dialog:open', async (event, type: 'file' | 'folder') => {
  const win = BrowserWindow.fromWebContents(event.sender) || mainWindow || undefined;
  const properties: Array<'openFile' | 'openDirectory'> = type === 'folder' ? ['openDirectory'] : ['openFile'];
  const filters = type === 'file' ? [{ name: 'Markdown Files', extensions: ['md', 'markdown', 'txt'] }] : undefined;

  const options = {
    title: type === 'folder' ? 'Open Workspace Folder' : 'Open Note',
    properties,
    filters,
  };

  const res = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);

  if (res.canceled || res.filePaths.length === 0) return null;
  return res.filePaths[0];
});

ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
  return fs.readFile(filePath, 'utf-8');
});

ipcMain.handle('fs:writeFile', async (_event, filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
});

ipcMain.handle('fs:createFile', async (_event, filePath: string, initialContent = '') => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, initialContent, { flag: 'wx' });
});

ipcMain.handle('fs:deleteFile', async (_event, filePath: string) => {
  await fs.unlink(filePath);
});

ipcMain.handle('fs:renameFile', async (_event, oldPath: string, newPath: string) => {
  await fs.rename(oldPath, newPath);
});

async function scanDirectory(dir: string): Promise<any[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue; // ignore hidden folders like .git
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const children = await scanDirectory(fullPath);
      nodes.push({
        name: entry.name,
        path: fullPath,
        isDirectory: true,
        children,
      });
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.markdown')) {
      nodes.push({
        name: entry.name,
        path: fullPath,
        isDirectory: false,
      });
    }
  }

  return nodes.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

ipcMain.handle('fs:listTree', async (_event, rootPath: string) => {
  if (!fsSync.existsSync(rootPath)) return [];
  return scanDirectory(rootPath);
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
