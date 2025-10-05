import { app, BrowserWindow, nativeTheme } from 'electron';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getProjectStore } from './state/index.js';
import { registerIpcHandlers } from './ipc/index.js';

const isDevelopment = process.env.NODE_ENV === 'development';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createMainWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    title: 'Axel Code Analyzer',
    backgroundColor: '#0d1b2a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Respect the system's dark mode preference for consistent visuals
  if (nativeTheme.shouldUseDarkColors) {
    mainWindow.setBackgroundColor('#0d1b2a');
  }

  const rendererUrl = pathToFileURL(
    path.join(__dirname, '../renderer/index.html')
  ).toString();

  void mainWindow.loadURL(rendererUrl);

  if (isDevelopment) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

app.whenReady().then(async () => {
  const store = getProjectStore();
  await store.load();

  registerIpcHandlers(store);

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
