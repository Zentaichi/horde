export interface PhpVersion {
    version: string;
    path: string;
    installed: boolean;
}
export interface DownloadProgress {
    percent: number;
    transferredBytes: number;
    totalBytes: number;
}
