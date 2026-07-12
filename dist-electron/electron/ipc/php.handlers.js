"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPhpHandlers = registerPhpHandlers;
const electron_1 = require("electron");
const tsyringe_1 = require("tsyringe");
function registerPhpHandlers() {
    const phpManager = tsyringe_1.container.resolve('IPhpManager');
    electron_1.ipcMain.handle('php:get-available-versions', async () => {
        return await phpManager.getAvailableVersions();
    });
    electron_1.ipcMain.handle('php:get-installed-versions', () => {
        return phpManager.getInstalledVersions();
    });
    electron_1.ipcMain.handle('php:download-version', async (event, version) => {
        const progressChannel = `php:download-progress-${version}`;
        await phpManager.downloadVersion(version, (progress) => {
            event.sender.send(progressChannel, progress);
        });
    });
    electron_1.ipcMain.handle('php:get-active-version', () => {
        return phpManager.getActiveVersion();
    });
    electron_1.ipcMain.handle('php:switch-global', async (_event, version) => {
        await phpManager.switchGlobal(version);
    });
    electron_1.ipcMain.handle('php:uninstall-version', async (_event, version) => {
        await phpManager.uninstallVersion(version);
    });
    electron_1.ipcMain.handle('app:open-directory', async (_event, dirPath) => {
        const result = await electron_1.shell.openPath(dirPath);
        if (result)
            throw new Error(result);
    });
}
//# sourceMappingURL=php.handlers.js.map