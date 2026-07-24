import { join } from 'path';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { inject, injectable } from 'tsyringe';
import type { IPlatformAdapter } from '../platform/IPlatformAdapter';
import type { IExtensionManager } from './interfaces/IExtensionManager';
import type { ExtensionInfo } from '../types/extension';

const execFileAsync = promisify(execFile);

@injectable()
export class ExtensionManager implements IExtensionManager {
  constructor(
    @inject('IPlatformAdapter') private readonly platform: IPlatformAdapter,
  ) {}

  async list(phpVersion: string): Promise<ExtensionInfo[]> {
    const phpBinary = this.resolvePhpBinary(phpVersion);
    const extDir = await this.getExtensionDir(phpBinary);

    if (!existsSync(extDir)) return [];

    const files = readdirSync(extDir);
    const extensionNames = files
      .filter((f) => f.endsWith('.dll') || f.endsWith('.so'))
      .map((f) => {
        if (f.startsWith('php_') && f.endsWith('.dll')) {
          return f.slice(4, -4);
        }
        if (f.endsWith('.so')) {
          return f.slice(0, -3);
        }
        return f;
      });

    const iniPath = await this.getPhpIniPath(phpBinary);
    const enabledSet = iniPath ? this.parseEnabledExtensions(iniPath) : new Set<string>();

    return extensionNames.map((name) => ({
      name,
      enabled: enabledSet.has(name),
      bundled: true as const,
    }));
  }

  async enable(phpVersion: string, extensionName: string): Promise<void> {
    const phpBinary = this.resolvePhpBinary(phpVersion);
    const iniPath = await this.getPhpIniPath(phpBinary);
    if (!iniPath) throw new Error('Could not locate php.ini.');

    const content = readFileSync(iniPath, 'utf-8');
    const lines = content.split('\n');
    const search = `extension=${extensionName}`;
    const searchDll = `extension=${this.platform.resolveExtensionFileName(extensionName)}`;

    let found = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === `;${search}` || trimmed === `;${searchDll}`) {
        lines[i] = lines[i].replace(/^;/, '');
        found = true;
        break;
      }
      if (trimmed === search || trimmed === searchDll) {
        found = true;
        break;
      }
    }

    if (!found) {
      lines.push(search);
    }

    writeFileSync(iniPath, lines.join('\n'), 'utf-8');
  }

  async disable(phpVersion: string, extensionName: string): Promise<void> {
    const phpBinary = this.resolvePhpBinary(phpVersion);
    const iniPath = await this.getPhpIniPath(phpBinary);
    if (!iniPath) throw new Error('Could not locate php.ini.');

    const content = readFileSync(iniPath, 'utf-8');
    const lines = content.split('\n');
    const search = `extension=${extensionName}`;
    const searchDll = `extension=${this.platform.resolveExtensionFileName(extensionName)}`;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed === search || trimmed === searchDll) {
        lines[i] = `;${lines[i]}`;
        break;
      }
    }

    writeFileSync(iniPath, lines.join('\n'), 'utf-8');
  }

  private resolvePhpBinary(version: string): string {
    const basePath = this.platform.getDefaultRuntimeInstallDir('php');
    return join(basePath, version, 'php' + this.platform.getBinaryExtension());
  }

  private async getExtensionDir(phpBinary: string): Promise<string> {
    const { stdout } = await execFileAsync(phpBinary, [
      '-r', 'echo PHP_EXTENSION_DIR;',
    ]);
    return stdout.trim();
  }

  private async getPhpIniPath(phpBinary: string): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync(phpBinary, [
        '-r', 'echo php_ini_loaded_file();',
      ]);
      const path = stdout.trim();
      return path || null;
    } catch {
      return null;
    }
  }

  private parseEnabledExtensions(iniPath: string): Set<string> {
    const content = readFileSync(iniPath, 'utf-8');
    const enabled = new Set<string>();
    const re = /^extension\s*=\s*(?:php_)?(\w+)/gm;
    let match;
    while ((match = re.exec(content)) !== null) {
      enabled.add(match[1]);
    }
    return enabled;
  }
}
