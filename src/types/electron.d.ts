export {};

declare global {
  interface Window {
    electronAPI: {
      php: {
        getAvailableVersions: () => Promise<string[]>;
        getInstalledVersions: () => Promise<PhpVersion[]>;
        downloadVersion: (version: string) => Promise<{ success: boolean }>;
        onDownloadProgress: (
          version: string,
          callback: (progress: DownloadProgress) => void
        ) => () => void;
      };
    };
  }

  interface PhpVersion {
    version: string;
    path: string;
    installed: boolean;
  }

  interface DownloadProgress {
    percent: number;
    transferredBytes: number;
    totalBytes: number;
  }
}