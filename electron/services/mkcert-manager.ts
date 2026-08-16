import { join } from "path";
import { existsSync } from "fs";
import { ensureDir } from "fs-extra";
import { execFile } from "child_process";
import { promisify } from "util";
import { inject, injectable } from "tsyringe";
import type { IPlatformAdapter } from "../platform/IPlatformAdapter";
import type { DownloadProgress } from "../types/php";
import type { MkcertStatus } from "../types/site";
import type { IMkcertManager } from "./interfaces/IMkcertManager";
import { SettingsStore } from "./settings-store";
import { downloadFile } from "../utils/download";

const execFileAsync = promisify(execFile);

const MKCERT_VERSION = "v3.4.4";
const CA_INSTALLED_KEY = "mkcert_ca_installed";

@injectable()
export class MkcertManager implements IMkcertManager {
  constructor(
    @inject("IPlatformAdapter") private readonly platform: IPlatformAdapter,
    @inject(SettingsStore) private readonly settings: SettingsStore
  ) {}

  private get installDir(): string {
    return this.platform.getDefaultRuntimeInstallDir("mkcert");
  }

  private get binaryPath(): string {
    return join(this.installDir, "mkcert" + this.platform.getBinaryExtension());
  }

  private get caroot(): string {
    return this.platform.getCertStoreDir();
  }

  private get rootCaPath(): string {
    return join(this.caroot, "rootCA.pem");
  }

  private get certPath(): string {
    return join(this.caroot, "wildcard.test.pem");
  }

  private get keyPath(): string {
    return join(this.caroot, "wildcard.test-key.pem");
  }

  async getStatus(): Promise<MkcertStatus> {
    const caInstalled =
      this.settings.get(CA_INSTALLED_KEY) === "true" &&
      existsSync(this.rootCaPath);

    return {
      binaryInstalled: existsSync(this.binaryPath),
      caInstalled,
      certPath: existsSync(this.certPath) ? this.certPath : null,
      keyPath: existsSync(this.keyPath) ? this.keyPath : null,
    };
  }

  async ensureInstalled(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    await this.ensureBinary(onProgress);
    await ensureDir(this.caroot);

    // mkcert -install generates the CA files in CAROOT; installing the root
    // certificate into the system trust store requires elevation and is done
    // separately through the platform adapter (ADR-0011).
    try {
      await this.runMkcert(["-install"]);
    } catch {
      // Trust installation may fail without admin rights — CA files are still
      // generated. The trust store step below performs the elevated install.
    }

    if (!existsSync(this.rootCaPath)) {
      throw new Error(
        "mkcert could not create its root CA. Check permissions for the certificate store."
      );
    }

    await this.platform.installCaTrust(this.rootCaPath);
    this.settings.set(CA_INSTALLED_KEY, "true");

    // A single wildcard cert covers every .test domain, so adding or removing
    // project domains never requires certificate regeneration.
    if (!existsSync(this.certPath) || !existsSync(this.keyPath)) {
      await this.runMkcert([
        "-cert-file",
        this.certPath,
        "-key-file",
        this.keyPath,
        "*.test",
        "*.localhost",
      ]);
    }
  }

  private async ensureBinary(
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<void> {
    if (existsSync(this.binaryPath)) return;
    await ensureDir(this.installDir);
    const url = this.platform.getMkcertDownloadUrl(MKCERT_VERSION);
    await downloadFile(url, this.binaryPath, onProgress);
  }

  private async runMkcert(args: string[]): Promise<void> {
    await execFileAsync(this.binaryPath, args, {
      env: { ...process.env, CAROOT: this.caroot },
    });
  }
}
