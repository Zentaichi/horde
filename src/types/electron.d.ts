import type { PhpVersion, DownloadProgress } from '@/shared/types/php';

export {};

declare global {
  interface Window {
    electronAPI: {
      php: {
        getAvailableVersions: () => Promise<string[]>;
        getInstalledVersions: () => Promise<PhpVersion[]>;
        downloadVersion: (version: string) => Promise<void>;
        getActiveVersion: () => Promise<string | null>;
        switchGlobal: (version: string) => Promise<void>;
        uninstallVersion: (version: string) => Promise<void>;
        onDownloadProgress: (
          version: string,
          callback: (progress: DownloadProgress) => void
        ) => () => void;
      };
      openDirectory: (path: string) => Promise<void>;
    };
  }
}
