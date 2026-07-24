import type { PhpVersion, DownloadProgress } from '@/shared/types/php';
import type { DatabaseVersion, DatabaseInstance, DownloadProgress as DbDownloadProgress } from '@/shared/types/database';
import type { Project } from '@/shared/types/project';
import type { DevServerStatus } from '@/shared/types/devserver';
import type { ExtensionInfo } from '@/shared/types/extensions';

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
        createDatabase: (instanceId: string, name: string) => Promise<void>;
        dropDatabase: (instanceId: string, name: string) => Promise<void>;
        listDatabases: (instanceId: string) => Promise<string[]>;
        onDownloadProgress: (
          engine: string,
          version: string,
          callback: (progress: DbDownloadProgress) => void,
        ) => () => void;
      };
      settings: {
        get: (key: string) => Promise<string | null>;
        set: (key: string, value: string) => Promise<void>;
      };
      projects: {
        list: () => Promise<Project[]>;
        add: (name: string) => Promise<Project>;
        remove: (projectId: string) => Promise<void>;
        scanPhpVersion: (projectId: string) => Promise<string | null>;
        scanAll: () => Promise<void>;
        openDir: (projectId: string) => Promise<void>;
      };
      devserver: {
        start: (projectId: string, port?: number) => Promise<DevServerStatus>;
        stop: (projectId: string) => Promise<void>;
        getStatus: (projectId: string) => Promise<DevServerStatus | null>;
        listAll: () => Promise<DevServerStatus[]>;
        getLogs: (projectId: string, tail?: number) => Promise<string[]>;
        onLog: (projectId: string, callback: (logs: string[]) => void) => () => void;
      };
      extensions: {
        list: (phpVersion: string) => Promise<ExtensionInfo[]>;
        enable: (phpVersion: string, extensionName: string) => Promise<void>;
        disable: (phpVersion: string, extensionName: string) => Promise<void>;
      };
      autostart: {
        getServices: () => Promise<any[]>;
        isEnabled: (serviceId: string) => Promise<boolean>;
        toggle: (serviceId: string, enabled: boolean) => Promise<void>;
        isBootEnabled: () => Promise<boolean>;
        toggleBoot: (enabled: boolean) => Promise<void>;
      };
      openDirectory: (path: string) => Promise<void>;
    };
  }
}
