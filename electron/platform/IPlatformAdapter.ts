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
  getAutoStartDir(): string;
}
