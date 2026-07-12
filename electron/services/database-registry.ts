import { injectable, singleton, container } from 'tsyringe';
import type { IDatabaseEngine } from './interfaces/IDatabaseEngine';
import type { DatabaseInstanceStatus } from '../types/database';

@injectable()
@singleton()
export class DatabaseRegistry {
  private readonly engines = new Map<string, IDatabaseEngine>();

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

  resolveEngineByInstance(instanceId: string): IDatabaseEngine {
    for (const engine of this.engines.values()) {
      try {
        engine.getStatus(instanceId);
        return engine;
      } catch {
        // Not this engine's instance, try next
      }
    }
    throw new Error(`No engine found for instance ${instanceId}`);
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
}
