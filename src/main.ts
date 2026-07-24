import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import os from 'os';

import { checkImgurConnectivity, uploadProviders } from './services/apiService';
import { convertGame, currentCancelToken, incrementCancelToken } from './services/converterService';
import { scanDirectoryForGames } from './services/scannerService';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html')).catch((err) => {
    console.error('Failed to load renderer/index.html', err);
  });
}

app.whenReady().then(() => {
  ipcMain.handle('app:getDefaultPath', () => {
    const home = os.homedir();
    if (process.platform === 'darwin') {
      return path.join(home, 'Library', 'Tabletop Simulator', 'Mods', 'Workshop');
    } else if (process.platform === 'win32') {
      return path.join(home, 'Documents', 'My Games', 'Tabletop Simulator', 'Mods', 'Workshop');
    } else if (process.platform === 'linux') {
      return path.parse(home).root;
    } else {
      return path.parse(home).root;
    }
  });

  ipcMain.handle('app:getProviderInfo', () => {
    const active = uploadProviders['catbox-url-upload'];
    return {
      id: active.id,
      name: active.name,
      requiresLocalDownload: active.requiresLocalDownload
    };
  });

  ipcMain.handle('net:checkImgur', async () => {
    return await checkImgurConnectivity();
  });

  let conversionMutex = Promise.resolve();

  ipcMain.handle('convert:cancel', () => {
    incrementCancelToken();
  });

  ipcMain.handle('convert:imgur', async (event, dirPath, fileId) => {
    let releaseMutex: () => void;
    const nextMutex = new Promise<void>(r => releaseMutex = r);
    const oldMutex = conversionMutex;
    conversionMutex = oldMutex.then(() => nextMutex);
    
    await oldMutex;

    const token = currentCancelToken;

    try {
      if (token !== currentCancelToken) {
        return { success: false, error: 'Cancelled by user' };
      }
      return await convertGame(dirPath, fileId, event.sender, token);
    } catch (err: any) {
      console.error(err);
      event.sender.send('backend:log', `[${fileId}] Fatal Error: ${err.message}`, 'error');
      return { success: false, error: err.message };
    } finally {
      releaseMutex!();
    }
  });

  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle('fs:scanDirectory', async (event, dirPath) => {
    return scanDirectoryForGames(dirPath, event.sender);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
