import type { PhpVersion, DownloadProgress } from '@/shared/types/php';

export {};

declare global {
  interface Window {
    electronAPI: {
      php: {
        getAvailableVersions: () => Promise<string[]>;
        getInstalledVersions: () => Promise<PhpVersion[]>;
        downloadVersion: (version: string) => Promise<void>;
        onDownloadProgress: (
          version: string,
          callback: (progress: DownloadProgress) => void
        ) => () => void;
      };
    };
  }
}
