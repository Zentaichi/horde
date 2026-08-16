import { join } from "path";
import { writeFile } from "fs-extra";
import type { IPlatformAdapter } from "../platform/IPlatformAdapter";

export const HORDE_TAG = "Horde managed";

export interface HostsApplyResult {
  changed: boolean;
  conflicts: string[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Read-modify-write wrapper around the platform hosts file. Only lines tagged
 * with `# Horde managed` are ever removed, so user-authored entries are never
 * clobbered. Existing user entries for a domain are respected (mapped to the
 * loopback host) and conflicts (mapped elsewhere) are reported, not overwritten.
 */
export class HostsFile {
  constructor(
    private readonly platform: IPlatformAdapter,
    private readonly backupDir: string
  ) {}

  async syncDomains(domains: string[]): Promise<HostsApplyResult> {
    const eol = this.platform.getHostsFileEol();
    const host = this.platform.getLoopbackHost();
    const original = await this.platform.readHostsFile();
    const wanted = new Set(
      domains
        .map((d) => d.toLowerCase().trim())
        .filter((d) => this.isValidHostname(d))
    );

    const kept: string[] = [];
    const present = new Set<string>();
    const conflicts: string[] = [];
    let removedCount = 0;

    for (const line of original.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) {
        kept.push(line);
        continue;
      }

      if (trimmed.includes(HORDE_TAG)) {
        const parts = trimmed.replace(HORDE_TAG, "").trim().split(/\s+/);
        const domain = parts[1]?.toLowerCase();
        if (domain && wanted.has(domain)) {
          present.add(domain);
          kept.push(line);
        } else if (domain) {
          removedCount++;
        }
        continue;
      }

      const parts = trimmed.split(/\s+/);
      const domain = parts[1]?.toLowerCase();
      if (domain && wanted.has(domain)) {
        if (parts[0] === host) {
          present.add(domain);
          kept.push(line);
        } else {
          conflicts.push(domain);
        }
        continue;
      }

      kept.push(line);
    }

    const missing = [...wanted].filter(
      (d) => !present.has(d) && !conflicts.includes(d)
    );
    for (const domain of missing) {
      kept.push(`${host} ${domain} # ${HORDE_TAG}`);
    }

    const changed = removedCount > 0 || missing.length > 0;
    if (changed) {
      const next = kept.join(eol) + (kept.length ? eol : "");
      await this.writeWithBackup(next, original);
    }

    return { changed, conflicts };
  }

  async removeDomains(domains: string[]): Promise<void> {
    const eol = this.platform.getHostsFileEol();
    const original = await this.platform.readHostsFile();
    const toRemove = new Set(
      domains.map((d) => d.toLowerCase().trim()).filter(Boolean)
    );

    const kept = original.split(/\r?\n/).filter((line) => {
      const trimmed = line.trim();
      if (!trimmed.includes(HORDE_TAG)) return true;
      const parts = trimmed.replace(HORDE_TAG, "").trim().split(/\s+/);
      const domain = parts[1]?.toLowerCase();
      return !(domain && toRemove.has(domain));
    });

    if (kept.length !== original.split(/\r?\n/).length) {
      const next = kept.join(eol) + (kept.length ? eol : "");
      await this.writeWithBackup(next, original);
    }
  }

  async hasDomains(domains: string[]): Promise<boolean> {
    const content = await this.platform.readHostsFile();
    return domains.every((d) => {
      const escaped = escapeRegExp(d.toLowerCase().trim());
      return new RegExp(`\\b${escaped}\\b`).test(content.toLowerCase());
    });
  }

  private isValidHostname(domain: string): boolean {
    if (!domain || domain.length > 253) return false;
    return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(
      domain
    );
  }

  private async writeWithBackup(next: string, original: string): Promise<void> {
    const backupPath = join(this.backupDir, "hosts.backup");
    await writeFile(backupPath, original, "utf-8");

    const now = await this.platform.readHostsFile();
    if (now !== original) {
      throw new Error(
        "Hosts file changed externally during update; aborting to avoid overwriting changes."
      );
    }

    try {
      await this.platform.writeHostsFile(next);
    } catch (err) {
      try {
        await this.platform.writeHostsFile(original);
      } catch {
        // Original restore failed too — surface the original error.
      }
      throw err;
    }
  }
}
