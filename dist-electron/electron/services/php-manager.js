"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PhpManager = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
const promises_1 = require("stream/promises");
const stream_1 = require("stream");
const fs_extra_1 = require("fs-extra");
const os_1 = require("os");
const tsyringe_1 = require("tsyringe");
let PhpManager = class PhpManager {
    platform;
    basePath;
    releasesCache = null;
    constructor(platform) {
        this.platform = platform;
        this.basePath = this.platform.getDefaultRuntimeInstallDir('php');
        if (!(0, fs_1.existsSync)(this.basePath)) {
            (0, fs_1.mkdirSync)(this.basePath, { recursive: true });
        }
    }
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
    async downloadVersion(version, onProgress) {
        const extractPath = (0, path_1.join)(this.basePath, version);
        if ((0, fs_1.existsSync)(extractPath)) {
            throw new Error(`PHP ${version} is already installed.`);
        }
        const zipUrl = await this.getDownloadUrl(version);
        const tempDir = (0, path_1.join)((0, os_1.tmpdir)(), 'horde-php-downloads');
        const zipPath = (0, path_1.join)(tempDir, `php-${version}.zip`);
        await (0, fs_extra_1.ensureDir)(tempDir);
        await this.downloadFile(zipUrl, zipPath, onProgress);
        try {
            await this.platform.extractZip(zipPath, extractPath);
        }
        catch (err) {
            throw new Error(`Extraction failed: ${err}`);
        }
    }
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
    async switchGlobal(version) {
        const versionPath = (0, path_1.join)(this.basePath, version);
        if (!(0, fs_1.existsSync)(versionPath)) {
            throw new Error(`PHP ${version} is not installed.`);
        }
        const entries = await this.platform.getPathEntries();
        const cleaned = this.filterHordeEntries(entries);
        cleaned.unshift(versionPath);
        await this.platform.writePathEntries(cleaned);
    }
    async uninstallVersion(version) {
        const versionPath = (0, path_1.join)(this.basePath, version);
        if (!(0, fs_1.existsSync)(versionPath)) {
            throw new Error(`PHP ${version} is not installed.`);
        }
        const activeVersion = this.getActiveVersion();
        if (activeVersion === version) {
            const entries = await this.platform.getPathEntries();
            const cleaned = this.filterHordeEntries(entries);
            await this.platform.writePathEntries(cleaned);
        }
        await (0, fs_extra_1.remove)(versionPath);
    }
    async fetchReleases() {
        if (this.releasesCache)
            return this.releasesCache;
        const url = this.platform.getPhpReleasesUrl();
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch releases: ${response.statusText}`);
        }
        const data = await response.json();
        this.releasesCache = data;
        return data;
    }
    async getDownloadUrl(version) {
        const releases = await this.fetchReleases();
        let targetRelease;
        for (const key of Object.keys(releases)) {
            if (releases[key]?.version === version) {
                targetRelease = releases[key];
                break;
            }
        }
        if (!targetRelease) {
            throw new Error(`Version ${version} not found in releases.`);
        }
        const preferredArch = Object.keys(targetRelease).find((k) => k.startsWith('nts-') && k.endsWith('-x64'));
        if (preferredArch && targetRelease[preferredArch]?.zip?.path) {
            return this.platform.getPhpDownloadUrl(targetRelease[preferredArch].zip.path);
        }
        const anyNts = Object.keys(targetRelease).find((k) => k.startsWith('nts-') && targetRelease[k]?.zip?.path);
        if (anyNts && targetRelease[anyNts]?.zip?.path) {
            return this.platform.getPhpDownloadUrl(targetRelease[anyNts].zip.path);
        }
        const anyBuild = Object.keys(targetRelease).find((k) => targetRelease[k]?.zip?.path);
        if (anyBuild && targetRelease[anyBuild]?.zip?.path) {
            return this.platform.getPhpDownloadUrl(targetRelease[anyBuild].zip.path);
        }
        throw new Error(`No downloadable zip found for PHP ${version}.`);
    }
    filterHordeEntries(entries) {
        return entries.filter((entry) => !entry.includes('Horde\\php') && !entry.includes('Horde/php'));
    }
    async downloadFile(url, destPath, onProgress) {
        const response = await fetch(url);
        if (!response.ok || !response.body) {
            throw new Error(`Download failed: ${response.statusText}`);
        }
        const totalBytes = Number(response.headers.get('content-length')) || 0;
        let transferredBytes = 0;
        const writer = (0, fs_1.createWriteStream)(destPath);
        const nodeReadable = stream_1.Readable.fromWeb(response.body);
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
};
exports.PhpManager = PhpManager;
exports.PhpManager = PhpManager = __decorate([
    (0, tsyringe_1.injectable)(),
    __param(0, (0, tsyringe_1.inject)('IPlatformAdapter')),
    __metadata("design:paramtypes", [Object])
], PhpManager);
//# sourceMappingURL=php-manager.js.map