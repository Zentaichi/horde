"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhpManager = void 0;
const path_1 = require("path");
const electron_1 = require("electron");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const util_1 = require("util");
const promises_1 = require("stream/promises");
const stream_1 = require("stream");
const fs_extra_1 = require("fs-extra");
const os_1 = require("os");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
class PhpManager {
    basePath;
    constructor() {
        // Wait until the app is ready to call getPath (see main.ts change below)
        this.basePath = (0, path_1.join)(electron_1.app.getPath('userData'), 'php');
        if (!(0, fs_1.existsSync)(this.basePath)) {
            (0, fs_1.mkdirSync)(this.basePath, { recursive: true });
        }
    }
    /**
     * Get available PHP versions – correctly parses the nested JSON.
     */
    async getAvailableVersions() {
        const url = 'https://windows.php.net/downloads/releases/releases.json';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch releases: ${response.statusText}`);
        }
        const data = await response.json();
        const versions = [];
        for (const key of Object.keys(data)) {
            const entry = data[key];
            // Each top‑level entry has a "version" field, e.g. "8.3.32"
            if (entry && typeof entry === 'object' && typeof entry.version === 'string') {
                versions.push(entry.version);
            }
        }
        // Sort descending (newest first)
        return versions.sort((a, b) => (b > a ? 1 : -1));
    }
    /**
     * List locally installed PHP versions.
     */
    getInstalledVersions() {
        if (!(0, fs_1.existsSync)(this.basePath))
            return [];
        return (0, fs_1.readdirSync)(this.basePath, { withFileTypes: true })
            .filter((dirent) => dirent.isDirectory())
            .map((dirent) => ({
            version: dirent.name,
            path: (0, path_1.join)(this.basePath, dirent.name),
            installed: true,
        }));
    }
    /**
     * Download a PHP zip and extract it.
     */
    async downloadVersion(version, onProgress) {
        const zipUrl = `https://windows.php.net/downloads/releases/php-${version}-nts-Win32-vs16-x64.zip`;
        const tempDir = (0, path_1.join)((0, os_1.tmpdir)(), 'horde-php-downloads');
        const zipPath = (0, path_1.join)(tempDir, `php-${version}.zip`);
        const extractPath = (0, path_1.join)(this.basePath, version);
        await (0, fs_extra_1.ensureDir)(tempDir);
        if ((0, fs_1.existsSync)(extractPath)) {
            throw new Error(`PHP ${version} is already installed.`);
        }
        // Download with progress
        await this.downloadFile(zipUrl, zipPath, onProgress);
        // Extract via PowerShell
        try {
            await execFileAsync('powershell', [
                '-Command',
                `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force`,
            ]);
        }
        catch (err) {
            throw new Error(`Extraction failed: ${err}`);
        }
    }
    /**
     * Helper: download file with progress callbacks.
     */
    async downloadFile(url, destPath, onProgress) {
        const response = await fetch(url);
        if (!response.ok || !response.body) {
            throw new Error(`Download failed: ${response.statusText}`);
        }
        const totalBytes = Number(response.headers.get('content-length')) || 0;
        let transferredBytes = 0;
        const writer = (0, fs_1.createWriteStream)(destPath);
        // Convert web ReadableStream to Node.js Readable
        const nodeReadable = stream_1.Readable.fromWeb(response.body);
        // Track progress by listening to 'data' events
        if (onProgress && totalBytes > 0) {
            nodeReadable.on('data', (chunk) => {
                transferredBytes += chunk.length;
                onProgress({
                    percent: Math.round((transferredBytes / totalBytes) * 100),
                    transferredBytes,
                    totalBytes,
                });
            });
        }
        // Pipe directly to the file
        await (0, promises_1.pipeline)(nodeReadable, writer);
    }
}
exports.PhpManager = PhpManager;
//# sourceMappingURL=php-manager.js.map