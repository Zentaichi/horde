import type { PhpVersion, DownloadProgress } from "@/shared/types/php";
import type {
  DatabaseVersion,
  DatabaseInstance,
  DownloadProgress as DbDownloadProgress,
} from "@/shared/types/database";
import type { Project } from "@/shared/types/project";
import type { DevServerStatus } from "@/shared/types/devserver";
import type { ExtensionInfo } from "@/shared/types/extensions";
import type {
  Site,
  SiteStatus,
  ProxyStatus,
  MkcertStatus,
  ScaffoldTemplate,
} from "@/shared/types/site";

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
      databases: {
        listEngines: () => Promise<{ engine: string; displayName: string }[]>;
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
        exportDatabase: (
          instanceId: string,
          databaseName: string,
          targetPath: string
        ) => Promise<void>;
        importDatabase: (
          instanceId: string,
          sourcePath: string,
          databaseName: string
        ) => Promise<void>;
        onDownloadProgress: (
          engine: string,
          version: string,
          callback: (progress: DbDownloadProgress) => void
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
        onLog: (
          projectId: string,
          callback: (logs: string[]) => void
        ) => () => void;
      };
      extensions: {
        list: (phpVersion: string) => Promise<ExtensionInfo[]>;
        enable: (phpVersion: string, extensionName: string) => Promise<void>;
        disable: (phpVersion: string, extensionName: string) => Promise<void>;
      };
      sites: {
        list: () => Promise<Site[]>;
        setDomains: (projectId: string, domains: string[]) => Promise<void>;
        enableSsl: (projectId: string, enabled: boolean) => Promise<void>;
        getStatus: () => Promise<SiteStatus>;
      };
      proxy: {
        getStatus: () => Promise<ProxyStatus>;
        start: () => Promise<void>;
        stop: () => Promise<void>;
        getLogs: (tail?: number) => Promise<string[]>;
      };
      mkcert: {
        getStatus: () => Promise<MkcertStatus>;
        install: () => Promise<void>;
      };
      scaffold: {
        listTemplates: () => Promise<ScaffoldTemplate[]>;
        create: (options: {
          template: string;
          name: string;
          parentDir: string;
        }) => Promise<void>;
        onLog: (callback: (line: string) => void) => () => void;
      };
      cli: {
        install: () => Promise<void>;
        uninstall: () => Promise<void>;
        isInstalled: () => Promise<boolean>;
      };
      autostart: {
        getServices: () => Promise<any[]>;
        isEnabled: (serviceId: string) => Promise<boolean>;
        toggle: (serviceId: string, enabled: boolean) => Promise<void>;
        isBootEnabled: () => Promise<boolean>;
        toggleBoot: (enabled: boolean) => Promise<void>;
      };
      openDirectory: (path: string) => Promise<void>;
      showSaveDialog: (options: {
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
      }) => Promise<string | null>;
      showOpenDialog: (options: {
        filters?: { name: string; extensions: string[] }[];
      }) => Promise<string | null>;
    };
  }
}
