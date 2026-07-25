import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getDefaultPath: () => ipcRenderer.invoke('app:getDefaultPath'),
  getProviderInfo: () => ipcRenderer.invoke('app:getProviderInfo'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  checkImgur: () => ipcRenderer.invoke('net:checkImgur'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  scanDirectory: (path: string) => ipcRenderer.invoke('fs:scanDirectory', path),
  cancelConversions: () => ipcRenderer.invoke('convert:cancel'),
  convertImgur: (dirPath: string, fileId: string, forceRestart: boolean = false) => ipcRenderer.invoke('convert:imgur', dirPath, fileId, forceRestart),
  onConvertProgress: (callback: (fileId: string, completed: number, total: number) => void) => {
    ipcRenderer.on('convert:progress', (event, fileId, completed, total) => callback(fileId, completed, total));
  },
  onLog: (callback: (message: string, type: 'info' | 'error' | 'warning') => void) => {
    ipcRenderer.on('backend:log', (event, message, type) => callback(message, type));
  }
});
