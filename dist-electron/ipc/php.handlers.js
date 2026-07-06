"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPhpHandlers = registerPhpHandlers;
const electron_1 = require("electron");
function registerPhpHandlers(phpManager) {
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
        // Return nothing – success is implied by resolving the promise
    });
}
//# sourceMappingURL=php.handlers.js.map