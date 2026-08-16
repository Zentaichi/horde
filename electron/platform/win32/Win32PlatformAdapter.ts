import { join } from "path";
import { app } from "electron";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { readFileSync, writeFileSync } from "fs";
import { ensureDir, remove } from "fs-extra";
import { injectable } from "tsyringe";
import type { IPlatformAdapter } from "../IPlatformAdapter";

const execFileAsync = promisify(execFile);

@injectable()
export class Win32PlatformAdapter implements IPlatformAdapter {
  readonly platform = "win32" as const;
  readonly displayName = "Windows";

  getDefaultRuntimeInstallDir(runtime: string): string {
    return join(app.getPath("userData"), runtime);
  }

  getDefaultDatabaseDataDir(engine: string): string {
    return join(app.getPath("userData"), "databases", engine);
  }

  getBinaryExtension(): string {
    return ".exe";
  }

  getPhpReleasesUrl(): string {
    return "https://windows.php.net/downloads/releases/releases.json";
  }

  getPhpDownloadUrl(zipPath: string): string {
    return `https://windows.php.net/downloads/releases/${zipPath}`;
  }

  getDatabaseReleasesUrl(engine: string): string {
    if (engine === "mysql") {
      return "https://downloads.mysql.com/archives/community/";
    }
    if (engine === "mariadb") {
      return "https://archive.mariadb.org/";
    }
    if (engine === "postgres") {
      return "https://www.postgresql.org/json/releases.json";
    }
    throw new Error(`No releases URL configured for engine: ${engine}`);
  }

  getDatabaseDownloadUrl(engine: string, version: string): string {
    if (engine === "mysql") {
      return `https://dev.mysql.com/get/Downloads/MySQL-${version.slice(0, 4)}/mysql-${version}-winx64.zip`;
    }
    if (engine === "mariadb") {
      return `https://archive.mariadb.org/mariadb-${version}/winx64-packages/mariadb-${version}-winx64.zip`;
    }
    if (engine === "postgres") {
      return `https://get.enterprisedb.com/postgresql/postgresql-${version}-windows-x64-binaries.zip`;
    }
    throw new Error(`No download URL configured for engine: ${engine}`);
  }

  async getPathEntries(): Promise<string[]> {
    try {
      const { stdout } = await execFileAsync("reg", [
        "query",
        "HKCU\\Environment",
        "/v",
        "PATH",
      ]);
      const match = stdout.match(/PATH\s+REG_\w+\s+(.+)/);
      const path = match ? match[1].trim() : "";
      return path ? path.split(";").filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  async writePathEntries(entries: string[]): Promise<void> {
    const newPath = entries.join(";");
    await execFileAsync("setx", ["PATH", newPath]);
    process.env.PATH = newPath;
  }

  resolveExecutablePath(binaryName: string, installDir: string): string {
    return join(installDir, binaryName + ".exe");
  }

  async extractZip(zipPath: string, destDir: string): Promise<void> {
    await execFileAsync("powershell", [
      "-Command",
      `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`,
    ]);
  }

  getHostsFilePath(): string {
    return "C:\\Windows\\System32\\drivers\\etc\\hosts";
  }

  getHostsFileEol(): string {
    return "\r\n";
  }

  getLoopbackHost(): string {
    return "127.0.0.1";
  }

  async readHostsFile(): Promise<string> {
    return readFileSync(this.getHostsFilePath(), "utf-8");
  }

  async writeHostsFile(content: string): Promise<void> {
    const hostsPath = this.getHostsFilePath();
    const tmpPath = join(tmpdir(), "horde-hosts.tmp");
    writeFileSync(tmpPath, content, "utf-8");
    try {
      await this.elevate("cmd.exe", ["/c", "copy", "/Y", tmpPath, hostsPath]);
    } finally {
      await remove(tmpPath);
    }
  }

  getAutoStartDir(): string {
    return join(
      app.getPath("userData"),
      "..",
      "Microsoft",
      "Windows",
      "Start Menu",
      "Programs",
      "Startup"
    );
  }

  getProxyDir(): string {
    return join(app.getPath("userData"), "proxy");
  }

  getCertStoreDir(): string {
    return join(app.getPath("userData"), "certs");
  }

  getCaddyDownloadUrl(version: string): string {
    return `https://github.com/caddyserver/caddy/releases/download/v${version}/caddy_${version}_windows_amd64.zip`;
  }

  getMkcertDownloadUrl(version: string): string {
    return `https://github.com/FiloSottile/mkcert/releases/download/v${version}/mkcert-v${version}-windows-amd64.exe`;
  }

  getComposerPharUrl(): string {
    return "https://getcomposer.org/download/latest-stable/composer.phar";
  }

  async installCaTrust(certPath: string): Promise<void> {
    await this.elevate("certutil", ["-addstore", "-f", "Root", certPath]);
  }

  canBindLowPorts(): boolean {
    return true;
  }

  async elevate(command: string, args: string[]): Promise<void> {
    const argList = args.map((a) => `'${a.replace(/'/g, "''")}'`).join(", ");
    await execFileAsync("powershell", [
      "-NoProfile",
      "-Command",
      `$p = Start-Process -FilePath '${command}' -ArgumentList @(${argList}) -Verb RunAs -Wait -PassThru; if ($null -eq $p) { exit 1 }; exit $p.ExitCode`,
    ]);
  }

  private getCliDir(): string {
    return join(app.getPath("home"), "Horde", "bin");
  }

  getCliInstallPath(name: string): string {
    return join(this.getCliDir(), `${name}.cmd`);
  }

  async installCliShim(
    name: string,
    targetPath: string,
    args: string[] = []
  ): Promise<void> {
    const dir = this.getCliDir();
    await ensureDir(dir);
    const argStr = args.join(" ");
    const shimPath = this.getCliInstallPath(name);
    writeFileSync(
      shimPath,
      `@echo off\r\n"${targetPath}" ${argStr} %*\r\n`,
      "utf-8"
    );

    const entries = await this.getPathEntries();
    if (!entries.includes(dir)) {
      entries.unshift(dir);
      await this.writePathEntries(entries);
    }
  }

  async uninstallCliShim(name: string): Promise<void> {
    await remove(this.getCliInstallPath(name));
  }

  resolveExtensionFileName(extensionName: string): string {
    return `php_${extensionName}.dll`;
  }

  async createAutoStartEntry(
    name: string,
    targetPath: string,
    args: string[] = []
  ): Promise<void> {
    const shortcutPath = join(this.getAutoStartDir(), `${name}.lnk`);
    const argStr = args.join(" ");
    await execFileAsync("powershell", [
      "-Command",
      `$ws = New-Object -ComObject WScript.Shell; $sc = $ws.CreateShortcut('${shortcutPath}'); $sc.TargetPath = '${targetPath}'; $sc.Arguments = '${argStr}'; $sc.Save()`,
    ]);
  }

  async removeAutoStartEntry(name: string): Promise<void> {
    const shortcutPath = join(this.getAutoStartDir(), `${name}.lnk`);
    await execFileAsync("powershell", [
      "-Command",
      `Remove-Item '${shortcutPath}' -Force -ErrorAction SilentlyContinue`,
    ]);
  }

  async killProcessTree(pid: number): Promise<void> {
    try {
      await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"]);
    } catch {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // Process already gone
      }
    }
  }
}
