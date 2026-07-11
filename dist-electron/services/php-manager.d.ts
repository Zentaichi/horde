export interface ProgressInfo {
    percent: number;
    transferredBytes: number;
    totalBytes: number;
}
export interface PhpVersion {
    version: string;
    path: string;
    installed: boolean;
}
export declare class PhpManager {
    private readonly basePath;
    private releasesCache;
    constructor();
    /**
     * Fetch releases JSON if not already cached.
     */
    private fetchReleases;
    /**
     * Get available PHP versions – sorted newest first.
     */
    getAvailableVersions(): Promise<string[]>;
    /**
     * List locally installed PHP versions.
     */
    getInstalledVersions(): PhpVersion[];
    /**
     * Find the download URL for a given version.
     * Priority: nts x64, then any nts, then first available.
     */
    private getDownloadUrl;
    /**
     * Download and extract a specific PHP version.
     */
    downloadVersion(version: string, onProgress?: (info: ProgressInfo) => void): Promise<void>;
    /**
     * Return the currently active Horde-managed PHP version from PATH.
     */
    getActiveVersion(): string | null;
    /**
     * Set a PHP version as the global default by updating the user PATH.
     */
    switchGlobal(version: string): Promise<void>;
    /**
     * Uninstall a PHP version: clean PATH if active, then delete the directory.
     */
    uninstallVersion(version: string): Promise<void>;
    private readUserPath;
    private filterHordeEntries;
    private writeUserPath;
    /**
     * Helper: download file with progress callbacks.
     */
    private downloadFile;
}
