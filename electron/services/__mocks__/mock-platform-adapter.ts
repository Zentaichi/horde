import { injectable } from "tsyringe";
import type { IPlatformAdapter } from "../../platform/IPlatformAdapter";

@injectable()
export class MockPlatformAdapter implements IPlatformAdapter {
  readonly platform = "win32" as const;
  readonly displayName = "Windows";

  hostsContent = "";

  getDefaultRuntimeInstallDir(runtime: string): string {
    return `/mock/userdata/${runtime}`;
  }

  getDefaultDatabaseDataDir(engine: string): string {
    return `/mock/userdata/databases/${engine}`;
  }

  getBinaryExtension(): string {
    return ".exe";
  }

  getPhpReleasesUrl(): string {
    return "https://mock.dev/php/releases";
  }

  getPhpDownloadUrl(zipPath: string): string {
    return `https://mock.dev/php/download/${zipPath}`;
  }

  getDatabaseReleasesUrl(engine: string): string {
    return `https://mock.dev/${engine}/releases`;
  }

  getDatabaseDownloadUrl(engine: string, version: string): string {
    return `https://mock.dev/${engine}/download/${version}`;
  }

  async getPathEntries(): Promise<string[]> {
    return ["/mock/path"];
  }

  async writePathEntries(_entries: string[]): Promise<void> {}

  resolveExecutablePath(binaryName: string, installDir: string): string {
    return `${installDir}/${binaryName}.exe`;
  }

  async extractZip(_zipPath: string, _destDir: string): Promise<void> {}

  getHostsFilePath(): string {
    return "/mock/hosts";
  }

  getHostsFileEol(): string {
    return "\n";
  }

  getLoopbackHost(): string {
    return "127.0.0.1";
  }

  async readHostsFile(): Promise<string> {
    return this.hostsContent;
  }

  async writeHostsFile(content: string): Promise<void> {
    this.hostsContent = content;
  }

  getAutoStartDir(): string {
    return "/mock/autostart";
  }

  getProxyDir(): string {
    return "/mock/userdata/proxy";
  }

  getCertStoreDir(): string {
    return "/mock/userdata/certs";
  }

  getCaddyDownloadUrl(version: string): string {
    return `https://mock.dev/caddy/download/${version}`;
  }

  getMkcertDownloadUrl(version: string): string {
    return `https://mock.dev/mkcert/download/${version}`;
  }

  getComposerPharUrl(): string {
    return "https://mock.dev/composer/composer.phar";
  }

  async installCaTrust(_certPath: string): Promise<void> {}

  canBindLowPorts(): boolean {
    return true;
  }

  async elevate(_command: string, _args: string[]): Promise<void> {}

  async installCliShim(
    _name: string,
    _targetPath: string,
    _args?: string[]
  ): Promise<void> {}

  async uninstallCliShim(_name: string): Promise<void> {}

  getCliInstallPath(name: string): string {
    return `/mock/bin/${name}`;
  }

  resolveExtensionFileName(extensionName: string): string {
    return `php_${extensionName}.dll`;
  }

  async createAutoStartEntry(
    _name: string,
    _targetPath: string,
    _args?: string[]
  ): Promise<void> {}

  async removeAutoStartEntry(_name: string): Promise<void> {}

  async killProcessTree(_pid: number): Promise<void> {}
}
