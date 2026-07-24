import { injectable } from 'tsyringe';
import type { IDevServerManager } from '../interfaces/IDevServerManager';
import type { DevServerStatus } from '../../types/devserver';
import type { IServiceProvider, ServiceStatus } from '../interfaces/IServiceRegistry';

@injectable()
export class MockDevServerManager implements IDevServerManager, IServiceProvider {
  readonly providerId = 'devserver';
  readonly displayName = 'Dev Servers';

  private servers = new Map<string, DevServerStatus>();

  async start(projectId: string, port?: number): Promise<DevServerStatus> {
    if (this.servers.has(projectId)) {
      throw new Error('Dev server is already running.');
    }
    const status: DevServerStatus = {
      projectId,
      projectName: `Project ${projectId}`,
      docroot: '/mock/project',
      phpVersion: '8.2',
      port: port || 8080,
      running: true,
      pid: 88888,
    };
    this.servers.set(projectId, status);
    return status;
  }

  async stop(projectId: string): Promise<void> {
    this.servers.delete(projectId);
  }

  async getStatus(projectId: string): Promise<DevServerStatus | null> {
    return this.servers.get(projectId) ?? null;
  }

  async listAll(): Promise<DevServerStatus[]> {
    return Array.from(this.servers.values());
  }

  async getLogs(projectId: string, tail?: number): Promise<string[]> {
    const logs = ['[mock] PHP development server started', `[mock] Listening on http://localhost:8080`];
    return tail ? logs.slice(-tail) : logs;
  }

  async getStatuses(): Promise<ServiceStatus[]> {
    const all = await this.listAll();
    return all.map((s) => ({
      serviceId: s.projectId,
      providerId: this.providerId,
      displayName: `${s.projectName} (PHP ${s.phpVersion})`,
      running: s.running,
      pid: s.pid,
      port: s.port,
    }));
  }
}
