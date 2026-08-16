import { join, delimiter } from "path";
import { existsSync, readdirSync } from "fs";
import { ensureDir } from "fs-extra";
import { spawn } from "child_process";
import { inject } from "tsyringe";
import type { IPlatformAdapter } from "../../platform/IPlatformAdapter";
import type { IPhpManager } from "../interfaces/IPhpManager";
import type { IScaffolder } from "../interfaces/IScaffolder";
import type { ScaffoldOptions } from "../../types/scaffold";
import { downloadFile } from "../../utils/download";

export abstract class ComposerScaffolder implements IScaffolder {
  abstract readonly id: string;
  abstract readonly displayName: string;
  abstract readonly minPhpVersion: string;
  protected abstract readonly packageName: string;

  constructor(
    @inject("IPlatformAdapter") protected readonly platform: IPlatformAdapter,
    @inject("IPhpManager") protected readonly phpManager: IPhpManager
  ) {}

  async createProject(
    options: ScaffoldOptions,
    onLog?: (line: string) => void
  ): Promise<{ path: string }> {
    const targetPath = join(options.parentDir, options.name);
    this.assertTargetWritable(targetPath);

    const phpBinary = await this.resolvePhpBinary();
    await this.assertPhpVersion(phpBinary);
    const composer = await this.resolveComposer(phpBinary);

    await this.runProcess(
      phpBinary,
      [
        composer,
        "create-project",
        this.packageName,
        targetPath,
        "--no-interaction",
        "--prefer-dist",
      ],
      onLog
    );

    await this.postCreate?.(phpBinary, composer, targetPath, onLog);
    return { path: targetPath };
  }

  protected async postCreate(
    _phpBinary: string,
    _composer: string,
    _targetPath: string,
    _onLog?: (line: string) => void
  ): Promise<void> {}

  private assertTargetWritable(targetPath: string): void {
    if (existsSync(targetPath) && readdirSync(targetPath).length > 0) {
      throw new Error(
        `Target directory already exists and is not empty: ${targetPath}`
      );
    }
    ensureDir(targetPath);
  }

  private async resolvePhpBinary(): Promise<string> {
    const ext = this.platform.getBinaryExtension();
    const base = this.platform.getDefaultRuntimeInstallDir("php");

    const active = this.phpManager.getActiveVersion();
    if (active) {
      const candidate = join(base, active, "php" + ext);
      if (existsSync(candidate)) return candidate;
    }

    const installed = this.phpManager.getInstalledVersions();
    if (installed.length > 0) {
      return join(base, installed[0].version, "php" + ext);
    }

    const systemPhp = this.phpManager.findPhpInPath();
    if (systemPhp) return systemPhp.binary;

    throw new Error(
      "No PHP installation found. Install a PHP version via the PHP tab first."
    );
  }

  private async assertPhpVersion(phpBinary: string): Promise<void> {
    const { execFileSync } = await import("child_process");
    let version = "";
    try {
      version = execFileSync(phpBinary, ["-r", "echo PHP_VERSION;"], {
        encoding: "utf-8",
        timeout: 10000,
      }).trim();
    } catch {
      // Unable to query version — continue; composer will surface real errors.
    }
    if (version && compareVersions(version, this.minPhpVersion) < 0) {
      throw new Error(
        `${this.displayName} requires PHP ${this.minPhpVersion}+ (found ${version}).`
      );
    }
  }

  private async resolveComposer(phpBinary: string): Promise<string> {
    const fromPath = this.findComposerInPath();
    if (fromPath) return fromPath;

    const dir = this.platform.getDefaultRuntimeInstallDir("composer");
    const phar = join(dir, "composer.phar");
    if (!existsSync(phar)) {
      await ensureDir(dir);
      await downloadFile(this.platform.getComposerPharUrl(), phar);
    }
    return phar;
  }

  private findComposerInPath(): string | null {
    const entries = (process.env.PATH || "").split(delimiter);
    for (const entry of entries) {
      for (const name of [
        "composer",
        "composer.bat",
        "composer.cmd",
        "composer.phar",
      ]) {
        const candidate = join(entry.trim(), name);
        if (existsSync(candidate)) return candidate;
      }
    }
    return null;
  }

  protected runProcess(
    command: string,
    args: string[],
    onLog?: (line: string) => void,
    cwd?: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: ["ignore", "pipe", "pipe"],
        cwd,
      });

      const emit = (data: Buffer) => {
        const text = data.toString().trim();
        if (text && onLog) onLog(text);
      };

      child.stdout?.on("data", emit);
      child.stderr?.on("data", emit);
      child.on("error", reject);
      child.on("exit", (code) => {
        if (code === 0) resolve();
        else
          reject(
            new Error(
              `${this.displayName} scaffold exited with code ${code}. See logs for details.`
            )
          );
      });
    });
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}
