import { injectable } from 'tsyringe';
import type { IExtensionManager } from '../interfaces/IExtensionManager';
import type { ExtensionInfo } from '../../types/extension';

@injectable()
export class MockExtensionManager implements IExtensionManager {
  async list(phpVersion: string): Promise<ExtensionInfo[]> {
    return [
      { name: 'curl', enabled: true, bundled: true },
      { name: 'mbstring', enabled: true, bundled: true },
      { name: 'openssl', enabled: false, bundled: true },
      { name: 'pdo_mysql', enabled: true, bundled: true },
      { name: 'gd', enabled: false, bundled: true },
      { name: 'zip', enabled: true, bundled: true },
    ];
  }

  async enable(phpVersion: string, extensionName: string): Promise<void> {}

  async disable(phpVersion: string, extensionName: string): Promise<void> {}
}
