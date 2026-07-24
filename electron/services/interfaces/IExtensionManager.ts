import type { ExtensionInfo } from '../../types/extension';

export interface IExtensionManager {
  list(phpVersion: string): Promise<ExtensionInfo[]>;
  enable(phpVersion: string, extensionName: string): Promise<void>;
  disable(phpVersion: string, extensionName: string): Promise<void>;
}
