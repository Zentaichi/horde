"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Win32PlatformAdapter = void 0;
const path_1 = require("path");
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const util_1 = require("util");
const tsyringe_1 = require("tsyringe");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
let Win32PlatformAdapter = class Win32PlatformAdapter {
    platform = 'win32';
    displayName = 'Windows';
    getDefaultRuntimeInstallDir(runtime) {
        return (0, path_1.join)(electron_1.app.getPath('userData'), runtime);
    }
    getDefaultDatabaseDataDir(engine) {
        return (0, path_1.join)(electron_1.app.getPath('userData'), 'databases', engine);
    }
    getBinaryExtension() {
        return '.exe';
    }
    getPhpReleasesUrl() {
        return 'https://windows.php.net/downloads/releases/releases.json';
    }
    getPhpDownloadUrl(zipPath) {
        return `https://windows.php.net/downloads/releases/${zipPath}`;
    }
    getDatabaseReleasesUrl(engine) {
        if (engine === 'mysql') {
            return 'https://downloads.mysql.com/archives/community/';
        }
        throw new Error(`No releases URL configured for engine: ${engine}`);
    }
    getDatabaseDownloadUrl(engine, version) {
        if (engine === 'mysql') {
            return `https://dev.mysql.com/get/Downloads/MySQL-${version.slice(0, 4)}/mysql-${version}-winx64.zip`;
        }
        throw new Error(`No download URL configured for engine: ${engine}`);
    }
    async getPathEntries() {
        try {
            const { stdout } = await execFileAsync('reg', [
                'query', 'HKCU\\Environment', '/v', 'PATH',
            ]);
            const match = stdout.match(/PATH\s+REG_\w+\s+(.+)/);
            const path = match ? match[1].trim() : '';
            return path ? path.split(';').filter(Boolean) : [];
        }
        catch {
            return [];
        }
    }
    async writePathEntries(entries) {
        const newPath = entries.join(';');
        await execFileAsync('setx', ['PATH', newPath]);
        process.env.PATH = newPath;
    }
    resolveExecutablePath(binaryName, installDir) {
        return (0, path_1.join)(installDir, binaryName + '.exe');
    }
    async extractZip(zipPath, destDir) {
        await execFileAsync('powershell', [
            '-Command',
            `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`,
        ]);
    }
    getHostsFilePath() {
        return 'C:\\Windows\\System32\\drivers\\etc\\hosts';
    }
    getAutoStartDir() {
        return (0, path_1.join)(electron_1.app.getPath('userData'), '..', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
    }
};
exports.Win32PlatformAdapter = Win32PlatformAdapter;
exports.Win32PlatformAdapter = Win32PlatformAdapter = __decorate([
    (0, tsyringe_1.injectable)()
], Win32PlatformAdapter);
//# sourceMappingURL=Win32PlatformAdapter.js.map