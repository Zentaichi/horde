import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  php: {
    getAvailableVersions: () => ipcRenderer.invoke('php:get-available-versions'),
    getInstalledVersions: () => ipcRenderer.invoke('php:get-installed-versions'),
    downloadVersion: (version: string) => ipcRenderer.invoke('php:download-version', version),
    // Listen to download progress for a specific version
    onDownloadProgress: (version: string, callback: (progress: any) => void) => {
      const channel = `php:download-progress-${version}`;
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
  },
});