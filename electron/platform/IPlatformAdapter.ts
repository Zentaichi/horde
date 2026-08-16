export interface IPlatformAdapter {
  readonly platform: NodeJS.Platform;
  readonly displayName: string;

  getDefaultRuntimeInstallDir(runtime: string): string;
  getDefaultDatabaseDataDir(engine: string): string;
  getBinaryExtension(): string;

  getPhpReleasesUrl(): string;
  getPhpDownloadUrl(zipPath: string): string;
  getDatabaseReleasesUrl(engine: string): string;
  getDatabaseDownloadUrl(engine: string, version: string): string;

  getPathEntries(): Promise<string[]>;
  writePathEntries(entries: string[]): Promise<void>;

  resolveExecutablePath(binaryName: string, installDir: string): string;
  extractZip(zipPath: string, destDir: string): Promise<void>;

  getHostsFilePath(): string;
  getHostsFileEol(): string;
  getLoopbackHost(): string;
  readHostsFile(): Promise<string>;
  writeHostsFile(content: string): Promise<void>;

  getAutoStartDir(): string;

  getProxyDir(): string;
  getCertStoreDir(): string;

  getCaddyDownloadUrl(version: string): string;
  getMkcertDownloadUrl(version: string): string;
  getComposerPharUrl(): string;

  installCaTrust(certPath: string): Promise<void>;
  canBindLowPorts(): boolean;
  elevate(command: string, args: string[]): Promise<void>;

  installCliShim(
    name: string,
    targetPath: string,
    args?: string[]
  ): Promise<void>;
  uninstallCliShim(name: string): Promise<void>;
  getCliInstallPath(name: string): string;

  resolveExtensionFileName(extensionName: string): string;
  createAutoStartEntry(
    name: string,
    targetPath: string,
    args?: string[]
  ): Promise<void>;
  removeAutoStartEntry(name: string): Promise<void>;

  killProcessTree(pid: number): Promise<void>;
}
