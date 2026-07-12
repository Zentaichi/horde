import type { PhpVersion, DownloadProgress } from '@/shared/types/php';
import type { DatabaseVersion, DatabaseInstance, DownloadProgress as DbDownloadProgress } from '@/shared/types/database';

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
          callback: (progress: DownloadProgress) => void,
        ) => () => void;
      };
      databases: {
        listEngines: () => Promise<string[]>;
        listAvailable: (engine: string) => Promise<string[]>;
        listInstalled: (engine: string) => Promise<string[]>;
        download: (engine: string, version: string) => Promise<void>;
        initialize: (config: {
          instanceId?: string;
          engine: string;
          version: string;
          port: number;
          datadir?: string;
          label?: string;
        }) => Promise<void>;
        start: (instanceId: string) => Promise<void>;
        stop: (instanceId: string) => Promise<void>;
        getStatus: (instanceId: string) => Promise<DatabaseInstance>;
        listInstances: () => Promise<DatabaseInstance[]>;
        removeInstance: (instanceId: string) => Promise<void>;
        uninstall: (engine: string, version: string) => Promise<void>;
        openInstallDir: (engine: string, version: string) => Promise<void>;
        onDownloadProgress: (
          engine: string,
          version: string,
          callback: (progress: DbDownloadProgress) => void,
        ) => () => void;
      };
      openDirectory: (path: string) => Promise<void>;
    };
  }
}
