"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    php: {
        getAvailableVersions: () => electron_1.ipcRenderer.invoke('php:get-available-versions'),
        getInstalledVersions: () => electron_1.ipcRenderer.invoke('php:get-installed-versions'),
        downloadVersion: (version) => electron_1.ipcRenderer.invoke('php:download-version', version),
        getActiveVersion: () => electron_1.ipcRenderer.invoke('php:get-active-version'),
        switchGlobal: (version) => electron_1.ipcRenderer.invoke('php:switch-global', version),
        uninstallVersion: (version) => electron_1.ipcRenderer.invoke('php:uninstall-version', version),
        onDownloadProgress: (version, callback) => {
            const channel = `php:download-progress-${version}`;
            const listener = (_event, progress) => callback(progress);
            electron_1.ipcRenderer.on(channel, listener);
            return () => electron_1.ipcRenderer.removeListener(channel, listener);
        },
    },
    openDirectory: (path) => electron_1.ipcRenderer.invoke('app:open-directory', path),
});
//# sourceMappingURL=preload.js.map