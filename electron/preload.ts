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
    uninstall: (engine: string, version: string) => ipcRenderer.invoke('databases:uninstall', engine, version),
    openInstallDir: (engine: string, version: string) => ipcRenderer.invoke('databases:open-install-dir', engine, version),
    createDatabase: (instanceId: string, name: string) => ipcRenderer.invoke('databases:create-database', instanceId, name),
    dropDatabase: (instanceId: string, name: string) => ipcRenderer.invoke('databases:drop-database', instanceId, name),
    listDatabases: (instanceId: string) => ipcRenderer.invoke('databases:list-databases', instanceId),
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
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('settings:set', key, value),
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    add: (name: string) => ipcRenderer.invoke('projects:add', name),
    remove: (projectId: string) => ipcRenderer.invoke('projects:remove', projectId),
    scanPhpVersion: (projectId: string) => ipcRenderer.invoke('projects:scan-php-version', projectId),
    scanAll: () => ipcRenderer.invoke('projects:scan-all'),
    openDir: (projectId: string) => ipcRenderer.invoke('projects:open-dir', projectId),
  },
  devserver: {
    start: (projectId: string, port?: number) => ipcRenderer.invoke('devserver:start', projectId, port),
    stop: (projectId: string) => ipcRenderer.invoke('devserver:stop', projectId),
    getStatus: (projectId: string) => ipcRenderer.invoke('devserver:get-status', projectId),
    listAll: () => ipcRenderer.invoke('devserver:list-all'),
    getLogs: (projectId: string, tail?: number) => ipcRenderer.invoke('devserver:get-logs', projectId, tail),
    onLog: (projectId: string, callback: (logs: string[]) => void) => {
      const channel = `devserver:log-${projectId}`;
      const listener = (_event: any, logs: string[]) => callback(logs);
      ipcRenderer.on(channel, listener);
      ipcRenderer.send('devserver:subscribe-logs', projectId);
      return () => {
        ipcRenderer.send('devserver:unsubscribe-logs', projectId);
        ipcRenderer.removeListener(channel, listener);
      };
    },
  },
  extensions: {
    list: (phpVersion: string) => ipcRenderer.invoke('extensions:list', phpVersion),
    enable: (phpVersion: string, extensionName: string) => ipcRenderer.invoke('extensions:enable', phpVersion, extensionName),
    disable: (phpVersion: string, extensionName: string) => ipcRenderer.invoke('extensions:disable', phpVersion, extensionName),
  },
  autostart: {
    getServices: () => ipcRenderer.invoke('autostart:get-services'),
    isEnabled: (serviceId: string) => ipcRenderer.invoke('autostart:is-enabled', serviceId),
    toggle: (serviceId: string, enabled: boolean) => ipcRenderer.invoke('autostart:toggle', serviceId, enabled),
    isBootEnabled: () => ipcRenderer.invoke('autostart:is-boot-enabled'),
    toggleBoot: (enabled: boolean) => ipcRenderer.invoke('autostart:toggle-boot', enabled),
  },
  openDirectory: (path: string) => ipcRenderer.invoke('app:open-directory', path),
});
