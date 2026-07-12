import type { IPlatformAdapter } from '../platform/IPlatformAdapter';
import type { IPhpManager } from './interfaces/IPhpManager';
import type { PhpVersion, DownloadProgress } from '../../src/shared/types/php';
export declare class PhpManager implements IPhpManager {
    private readonly platform;
    private readonly basePath;
    private releasesCache;
    constructor(platform: IPlatformAdapter);
    getAvailableVersions(): Promise<string[]>;
    getInstalledVersions(): PhpVersion[];
    downloadVersion(version: string, onProgress?: (info: DownloadProgress) => void): Promise<void>;
    getActiveVersion(): string | null;
    switchGlobal(version: string): Promise<void>;
    uninstallVersion(version: string): Promise<void>;
    private fetchReleases;
    private getDownloadUrl;
    private filterHordeEntries;
    private downloadFile;
}
