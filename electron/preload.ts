import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  php: {
    getAvailableVersions: () => ipcRenderer.invoke('php:get-available-versions'),
    getInstalledVersions: () => ipcRenderer.invoke('php:get-installed-versions'),
    downloadVersion: (version: string) => ipcRenderer.invoke('php:download-version', version),
    getActiveVersion: () => ipcRenderer.invoke('php:get-active-version'),
    switchGlobal: (version: string) => ipcRenderer.invoke('php:switch-global', version),
    uninstallVersion: (version: string) => ipcRenderer.invoke('php:uninstall-version', version),
    onDownloadProgress: (version: string, callback: (progress: any) => void) => {
      const channel = `php:download-progress-${version}`;
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
  },
  databases: {
    listEngines: () => ipcRenderer.invoke('databases:list-engines'),
    listAvailable: (engine: string) => ipcRenderer.invoke('databases:list-available', engine),
    listInstalled: (engine: string) => ipcRenderer.invoke('databases:list-installed', engine),
    download: (engine: string, version: string) =>
      ipcRenderer.invoke('databases:download', engine, version),
    initialize: (config: any) => ipcRenderer.invoke('databases:initialize', config),
    start: (instanceId: string) => ipcRenderer.invoke('databases:start', instanceId),
    stop: (instanceId: string) => ipcRenderer.invoke('databases:stop', instanceId),
    getStatus: (instanceId: string) => ipcRenderer.invoke('databases:get-status', instanceId),
    listInstances: () => ipcRenderer.invoke('databases:list-instances'),
    removeInstance: (instanceId: string) => ipcRenderer.invoke('databases:remove-instance', instanceId),
    onDownloadProgress: (
      engine: string,
      version: string,
      callback: (progress: any) => void,
    ) => {
      const channel = `database:download-progress-${engine}-${version}`;
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on(channel, listener);
      return () => ipcRenderer.removeListener(channel, listener);
    },
  },
  openDirectory: (path: string) => ipcRenderer.invoke('app:open-directory', path),
});
