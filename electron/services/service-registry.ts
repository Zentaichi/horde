import { injectable, singleton } from 'tsyringe';
import type { IServiceProvider, ServiceStatus } from './interfaces/IServiceRegistry';

@injectable()
@singleton()
export class ServiceRegistry {
  private readonly providers = new Map<string, IServiceProvider>();

  registerProvider(provider: IServiceProvider): void {
    this.providers.set(provider.providerId, provider);
  }

  getProvider(providerId: string): IServiceProvider {
    const provider = this.providers.get(providerId);
    if (!provider) throw new Error(`Service provider "${providerId}" is not registered.`);
    return provider;
  }

  async getAllStatuses(): Promise<ServiceStatus[]> {
    const results: ServiceStatus[] = [];
    for (const provider of this.providers.values()) {
      try {
        const statuses = await provider.getStatuses();
        results.push(...statuses);
      } catch {
        // Provider may not support status queries yet
      }
    }
    return results;
  }

  async restoreAll(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.reattachOrphans?.();
    }
  }
}
