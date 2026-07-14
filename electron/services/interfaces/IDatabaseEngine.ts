import type { DatabaseInstanceConfig, DatabaseInstanceStatus } from '../../types/database';

export type ProgressCallback = (info: { percent: number; transferredBytes: number; totalBytes: number }) => void;

export interface IDatabaseEngine {
  readonly engine: string;
  readonly displayName: string;

  listAvailable(): Promise<string[]>;
  listInstalled(): Promise<string[]>;

  download(version: string, onProgress?: ProgressCallback): Promise<void>;
  uninstall(version: string): Promise<void>;

  initialize(config: DatabaseInstanceConfig): Promise<void>;
  start(instanceId: string): Promise<void>;
  stop(instanceId: string): Promise<void>;
  restart(instanceId: string): Promise<void>;
  getStatus(instanceId: string): Promise<DatabaseInstanceStatus>;
  listInstances(): Promise<DatabaseInstanceStatus[]>;
  removeInstance(instanceId: string): Promise<void>;

  restoreInstance(config: DatabaseInstanceConfig): Promise<void>;

  createDatabase(instanceId: string, name: string): Promise<void>;
  dropDatabase(instanceId: string, name: string): Promise<void>;
  listDatabases(instanceId: string): Promise<string[]>;
}
