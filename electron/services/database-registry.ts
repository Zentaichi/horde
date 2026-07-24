import { inject, injectable, singleton } from 'tsyringe';
import type { IDatabaseEngine } from './interfaces/IDatabaseEngine';
import type { DatabaseInstanceConfig, DatabaseInstanceStatus } from '../types/database';
import type { IServiceProvider, ServiceStatus } from './interfaces/IServiceRegistry';
import { SettingsStore } from './settings-store';

@injectable()
@singleton()
export class DatabaseRegistry implements IServiceProvider {
  readonly providerId = 'mysql';
  readonly displayName = 'MySQL';
  private readonly engines = new Map<string, IDatabaseEngine>();

  constructor(
    @inject(SettingsStore) private readonly settingsStore: SettingsStore,
  ) {}

  register(engine: IDatabaseEngine): void {
    this.engines.set(engine.engine, engine);
  }

  listEngines(): string[] {
    return Array.from(this.engines.keys());
  }

  findEngine(engine: string): IDatabaseEngine {
    const inst = this.engines.get(engine);
    if (!inst) throw new Error(`Engine "${engine}" is not registered.`);
    return inst;
  }

  async resolveEngineByInstance(instanceId: string): Promise<IDatabaseEngine> {
    for (const engine of this.engines.values()) {
      try {
        await engine.getStatus(instanceId);
        return engine;
      } catch {
        // Not this engine's instance, try next
      }
    }
    throw new Error(`No engine found for instance ${instanceId}`);
  }

  async restoreInstances(): Promise<void> {
    const persisted = this.settingsStore.loadInstances();
    for (const config of persisted) {
      const engine = this.findEngine(config.engine);
      await engine.restoreInstance(config);
    }
  }

  async createInstance(config: DatabaseInstanceConfig): Promise<void> {
    const engine = this.findEngine(config.engine);
    await engine.initialize(config);
    this.settingsStore.saveInstance(config);
  }

  async deleteInstance(instanceId: string): Promise<void> {
    const engine = await this.resolveEngineByInstance(instanceId);
    await engine.removeInstance(instanceId);
    this.settingsStore.deleteInstance(instanceId);
  }

  async listAllInstances(): Promise<DatabaseInstanceStatus[]> {
    const results: DatabaseInstanceStatus[] = [];
    for (const engine of this.engines.values()) {
      try {
        const instances = await engine.listInstances();
        results.push(...instances);
      } catch {
        // Ignore engines that don't support listing
      }
    }
    return results;
  }

  async getStatuses(): Promise<ServiceStatus[]> {
    const instances = await this.listAllInstances();
    return instances.map((inst) => ({
      serviceId: `${this.providerId}:${inst.instanceId}`,
      providerId: this.providerId,
      engine: inst.engine,
      displayName: `${inst.engine} ${inst.version}`,
      running: inst.running,
      pid: inst.pid,
      port: inst.port,
    }));
  }

  async reattachOrphans(): Promise<void> {
    const persisted = this.settingsStore.loadInstances();
    for (const config of persisted) {
      try {
        const engine = this.findEngine(config.engine);
        const status = await engine.getStatus(config.instanceId);
        if (!status.running) {
          await engine.restoreInstance(config);
        }
      } catch {
        const engine = this.findEngine(config.engine);
        await engine.restoreInstance(config);
      }
    }
  }
}
