import { injectable } from 'tsyringe';
import type { IDatabaseEngine, ProgressCallback } from '../interfaces/IDatabaseEngine';
import type { DatabaseInstanceConfig, DatabaseInstanceStatus } from '../../types/database';

@injectable()
export class MockMySqlManager implements IDatabaseEngine {
  readonly engine = 'mysql';
  readonly displayName = 'MySQL';

  private instances = new Map<string, { config: DatabaseInstanceConfig; running: boolean }>();

  async listAvailable(): Promise<string[]> {
    return ['8.0.37', '8.0.36', '5.7.44'];
  }

  async listInstalled(): Promise<string[]> {
    return ['8.0.37'];
  }

  async download(version: string, onProgress?: ProgressCallback): Promise<void> {
    if (onProgress) {
      for (let i = 0; i <= 100; i += 25) {
        onProgress({ percent: i, transferredBytes: i * 50000, totalBytes: 5000000 });
        await new Promise((r) => setTimeout(r, 30));
      }
    }
  }

  async uninstall(version: string): Promise<void> {}

  async initialize(config: DatabaseInstanceConfig): Promise<void> {
    if (!config.instanceId) config.instanceId = `mock-mysql-${Date.now()}`;
    this.instances.set(config.instanceId, { config: { ...config }, running: false });
  }

  async start(instanceId: string): Promise<void> {
    const inst = this.instances.get(instanceId);
    if (!inst) throw new Error(`Instance ${instanceId} not found.`);
    inst.running = true;
  }

  async stop(instanceId: string): Promise<void> {
    const inst = this.instances.get(instanceId);
    if (!inst) return;
    inst.running = false;
  }

  async restart(instanceId: string): Promise<void> {
    await this.stop(instanceId);
    await this.start(instanceId);
  }

  async getStatus(instanceId: string): Promise<DatabaseInstanceStatus> {
    const inst = this.instances.get(instanceId);
    if (!inst) throw new Error(`Instance ${instanceId} not found.`);
    return {
      instanceId,
      engine: inst.config.engine,
      version: inst.config.version,
      port: inst.config.port,
      running: inst.running,
      pid: inst.running ? 99999 : undefined,
    };
  }

  async listInstances(): Promise<DatabaseInstanceStatus[]> {
    const results: DatabaseInstanceStatus[] = [];
    for (const [id, inst] of this.instances) {
      results.push(await this.getStatus(id));
    }
    return results;
  }

  async removeInstance(instanceId: string): Promise<void> {
    this.instances.delete(instanceId);
  }

  async restoreInstance(config: DatabaseInstanceConfig): Promise<void> {
    this.instances.set(config.instanceId, { config: { ...config }, running: false });
  }

  async createDatabase(instanceId: string, name: string): Promise<void> {
    const inst = this.instances.get(instanceId);
    if (!inst) throw new Error(`Instance ${instanceId} not found.`);
  }

  async dropDatabase(instanceId: string, name: string): Promise<void> {
    const inst = this.instances.get(instanceId);
    if (!inst) throw new Error(`Instance ${instanceId} not found.`);
  }

  async listDatabases(instanceId: string): Promise<string[]> {
    return ['test_db', 'app_db'];
  }
}
