import { join } from 'path';
import { app } from 'electron';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { injectable } from 'tsyringe';
import type { IPlatformAdapter } from '../IPlatformAdapter';

const execFileAsync = promisify(execFile);

@injectable()
export class Win32PlatformAdapter implements IPlatformAdapter {
  readonly platform = 'win32' as const;
  readonly displayName = 'Windows';

  getDefaultRuntimeInstallDir(runtime: string): string {
    return join(app.getPath('userData'), runtime);
  }

  getDefaultDatabaseDataDir(engine: string): string {
    return join(app.getPath('userData'), 'databases', engine);
  }

  getBinaryExtension(): string {
    return '.exe';
  }

  getPhpReleasesUrl(): string {
    return 'https://windows.php.net/downloads/releases/releases.json';
  }

  getPhpDownloadUrl(zipPath: string): string {
    return `https://windows.php.net/downloads/releases/${zipPath}`;
  }

  getDatabaseReleasesUrl(engine: string): string {
    if (engine === 'mysql') {
      return 'https://downloads.mysql.com/archives/community/';
    }
    throw new Error(`No releases URL configured for engine: ${engine}`);
  }

  getDatabaseDownloadUrl(engine: string, version: string): string {
    if (engine === 'mysql') {
      return `https://dev.mysql.com/get/Downloads/MySQL-${version.slice(0, 4)}/mysql-${version}-winx64.zip`;
    }
    throw new Error(`No download URL configured for engine: ${engine}`);
  }

  async getPathEntries(): Promise<string[]> {
    try {
      const { stdout } = await execFileAsync('reg', [
        'query', 'HKCU\\Environment', '/v', 'PATH',
      ]);
      const match = stdout.match(/PATH\s+REG_\w+\s+(.+)/);
      const path = match ? match[1].trim() : '';
      return path ? path.split(';').filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  async writePathEntries(entries: string[]): Promise<void> {
    const newPath = entries.join(';');
    await execFileAsync('setx', ['PATH', newPath]);
    process.env.PATH = newPath;
  }

  resolveExecutablePath(binaryName: string, installDir: string): string {
    return join(installDir, binaryName + '.exe');
  }

  async extractZip(zipPath: string, destDir: string): Promise<void> {
    await execFileAsync('powershell', [
      '-Command',
      `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`,
    ]);
  }

  getHostsFilePath(): string {
    return 'C:\\Windows\\System32\\drivers\\etc\\hosts';
  }

  getAutoStartDir(): string {
    return join(app.getPath('userData'), '..', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
  }

  resolveExtensionFileName(extensionName: string): string {
    return `php_${extensionName}.dll`;
  }

  async createAutoStartEntry(name: string, targetPath: string, args: string[] = []): Promise<void> {
    const shortcutPath = join(this.getAutoStartDir(), `${name}.lnk`);
    const argStr = args.join(' ');
    await execFileAsync('powershell', [
      '-Command',
      `$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('${shortcutPath}'); $sc.TargetPath = '${targetPath}'; $sc.Arguments = '${argStr}'; $sc.Save()`,
    ]);
  }

  async removeAutoStartEntry(name: string): Promise<void> {
    const shortcutPath = join(this.getAutoStartDir(), `${name}.lnk`);
    await execFileAsync('powershell', [
      '-Command',
      `Remove-Item '${shortcutPath}' -Force -ErrorAction SilentlyContinue`,
    ]);
  }
}
