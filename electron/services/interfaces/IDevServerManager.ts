import type { DevServerStatus } from '../../types/devserver';

export interface IDevServerManager {
  start(projectId: string, port?: number): Promise<DevServerStatus>;
  stop(projectId: string): Promise<void>;
  getStatus(projectId: string): Promise<DevServerStatus | null>;
  listAll(): Promise<DevServerStatus[]>;
  getLogs(projectId: string, tail?: number): Promise<string[]>;
}
