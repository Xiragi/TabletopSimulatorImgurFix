import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getDefaultPath: () => ipcRenderer.invoke('app:getDefaultPath'),
  getProviderInfo: () => ipcRenderer.invoke('app:getProviderInfo'),
  checkImgur: () => ipcRenderer.invoke('net:checkImgur'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  scanDirectory: (path: string) => ipcRenderer.invoke('fs:scanDirectory', path),
  cancelConversions: () => ipcRenderer.invoke('convert:cancel'),
  convertImgur: (dirPath: string, fileId: string) => ipcRenderer.invoke('convert:imgur', dirPath, fileId),
  onConvertProgress: (callback: (fileId: string, completed: number, total: number) => void) => {
    ipcRenderer.on('convert:progress', (event, fileId, completed, total) => callback(fileId, completed, total));
  },
  onLog: (callback: (message: string, type: 'info' | 'error' | 'warning') => void) => {
    ipcRenderer.on('backend:log', (event, message, type) => callback(message, type));
  }
});
