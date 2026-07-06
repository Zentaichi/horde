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
    constructor();
    /**
     * Get available PHP versions – correctly parses the nested JSON.
     */
    getAvailableVersions(): Promise<string[]>;
    /**
     * List locally installed PHP versions.
     */
    getInstalledVersions(): PhpVersion[];
    /**
     * Download a PHP zip and extract it.
     */
    downloadVersion(version: string, onProgress?: (info: ProgressInfo) => void): Promise<void>;
    /**
     * Helper: download file with progress callbacks.
     */
    private downloadFile;
}
