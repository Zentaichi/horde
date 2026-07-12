export interface ProgressInfo {
    percent: number;
    transferredBytes: number;
    totalBytes: number;
}
export declare function downloadFile(url: string, destPath: string, onProgress?: (info: ProgressInfo) => void): Promise<void>;
