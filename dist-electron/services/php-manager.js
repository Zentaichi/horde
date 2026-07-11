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
    releasesCache = null;
    constructor() {
        this.basePath = (0, path_1.join)(electron_1.app.getPath('userData'), 'php');
        if (!(0, fs_1.existsSync)(this.basePath)) {
            (0, fs_1.mkdirSync)(this.basePath, { recursive: true });
        }
    }
    /**
     * Fetch releases JSON if not already cached.
     */
    async fetchReleases() {
        if (this.releasesCache)
            return this.releasesCache;
        const url = 'https://windows.php.net/downloads/releases/releases.json';
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch releases: ${response.statusText}`);
        }
        const data = await response.json();
        this.releasesCache = data;
        return data;
    }
    /**
     * Get available PHP versions – sorted newest first.
     */
    async getAvailableVersions() {
        const data = await this.fetchReleases();
        const versions = [];
        for (const key of Object.keys(data)) {
            const entry = data[key];
            if (entry && typeof entry === 'object' && typeof entry.version === 'string') {
                versions.push(entry.version);
            }
        }
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
     * Find the download URL for a given version.
     * Priority: nts x64, then any nts, then first available.
     */
    async getDownloadUrl(version) {
        const releases = await this.fetchReleases();
        let targetRelease;
        // Find the release object that has the exact "version" field
        for (const key of Object.keys(releases)) {
            if (releases[key]?.version === version) {
                targetRelease = releases[key];
                break;
            }
        }
        if (!targetRelease) {
            throw new Error(`Version ${version} not found in releases.`);
        }
        // Preferred: nts x64
        const preferredArch = Object.keys(targetRelease).find((k) => k.startsWith('nts-') && k.endsWith('-x64'));
        if (preferredArch && targetRelease[preferredArch]?.zip?.path) {
            const zipPath = targetRelease[preferredArch].zip.path;
            return `https://windows.php.net/downloads/releases/${zipPath}`;
        }
        // Fallback: any nts build
        const anyNts = Object.keys(targetRelease).find((k) => k.startsWith('nts-') && targetRelease[k]?.zip?.path);
        if (anyNts && targetRelease[anyNts]?.zip?.path) {
            const zipPath = targetRelease[anyNts].zip.path;
            return `https://windows.php.net/downloads/releases/${zipPath}`;
        }
        // Last resort: any build with a zip
        const anyBuild = Object.keys(targetRelease).find((k) => targetRelease[k]?.zip?.path);
        if (anyBuild && targetRelease[anyBuild]?.zip?.path) {
            const zipPath = targetRelease[anyBuild].zip.path;
            return `https://windows.php.net/downloads/releases/${zipPath}`;
        }
        throw new Error(`No downloadable zip found for PHP ${version}.`);
    }
    /**
     * Download and extract a specific PHP version.
     */
    async downloadVersion(version, onProgress) {
        const extractPath = (0, path_1.join)(this.basePath, version);
        if ((0, fs_1.existsSync)(extractPath)) {
            throw new Error(`PHP ${version} is already installed.`);
        }
        const zipUrl = await this.getDownloadUrl(version);
        const tempDir = (0, path_1.join)((0, os_1.tmpdir)(), 'horde-php-downloads');
        const zipPath = (0, path_1.join)(tempDir, `php-${version}.zip`);
        await (0, fs_extra_1.ensureDir)(tempDir);
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
     * Return the currently active Horde-managed PHP version from PATH.
     */
    getActiveVersion() {
        const entries = (process.env.PATH || '').split(';');
        for (const entry of entries) {
            if (entry.startsWith(this.basePath)) {
                const relative = entry.slice(this.basePath.length).replace(/^[\\/]+/, '');
                const version = relative.split(/[\\/]/)[0];
                if (version)
                    return version;
            }
        }
        return null;
    }
    /**
     * Set a PHP version as the global default by updating the user PATH.
     */
    async switchGlobal(version) {
        const versionPath = (0, path_1.join)(this.basePath, version);
        if (!(0, fs_1.existsSync)(versionPath)) {
            throw new Error(`PHP ${version} is not installed.`);
        }
        const currentPath = await this.readUserPath();
        const entries = this.filterHordeEntries(currentPath.split(';').filter(Boolean));
        entries.unshift(versionPath);
        await this.writeUserPath(entries);
    }
    /**
     * Uninstall a PHP version: clean PATH if active, then delete the directory.
     */
    async uninstallVersion(version) {
        const versionPath = (0, path_1.join)(this.basePath, version);
        if (!(0, fs_1.existsSync)(versionPath)) {
            throw new Error(`PHP ${version} is not installed.`);
        }
        const activeVersion = this.getActiveVersion();
        if (activeVersion === version) {
            const currentPath = await this.readUserPath();
            const entries = this.filterHordeEntries(currentPath.split(';').filter(Boolean));
            await this.writeUserPath(entries);
        }
        await (0, fs_extra_1.remove)(versionPath);
    }
    async readUserPath() {
        try {
            const { stdout } = await execFileAsync('reg', [
                'query', 'HKCU\\Environment', '/v', 'PATH',
            ]);
            const match = stdout.match(/PATH\s+REG_\w+\s+(.+)/);
            return match ? match[1].trim() : '';
        }
        catch {
            return '';
        }
    }
    filterHordeEntries(entries) {
        return entries.filter((entry) => !entry.includes('Horde\\php') && !entry.includes('Horde/php'));
    }
    async writeUserPath(entries) {
        const newPath = entries.join(';');
        await execFileAsync('setx', ['PATH', newPath]);
        process.env.PATH = newPath;
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
        await (0, promises_1.pipeline)(nodeReadable, writer);
    }
}
exports.PhpManager = PhpManager;
//# sourceMappingURL=php-manager.js.map