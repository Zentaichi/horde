# ADR-0004: Platform Abstraction Boundary (IPlatformAdapter)

**Status:** accepted

**Date:** 2026-07-09

## Context

Horde's MVP targets Windows only. Cross-platform support (macOS, Linux) is a Phase 6 goal. If platform-specific logic (PATH manipulation, ZIP extraction, binary URLs, filesystem paths) is scattered across service classes with `process.platform` branches, porting later requires auditing every service file for OS-dependent code — a high-risk refactor.

We need a design where:

1. Platform-specific code is centralized in one file per platform.
2. Services never branch on `process.platform`.
3. The abstraction is cheap to define now (interface only) and its Windows implementation is built for MVP.
4. macOS/Linux implementations are single-class files added in Phase 6 without touching any service code.

## Decision

Define an **`IPlatformAdapter` interface** that every OS-specific concern flows through. Services receive the adapter via constructor injection.

**Interface (`electron/platform/IPlatformAdapter.ts`):**

```ts
export interface IPlatformAdapter {
  readonly platform: NodeJS.Platform;
  readonly displayName: string;

  // Filesystem layout
  getDefaultRuntimeInstallDir(runtime: string): string;
  getDefaultDatabaseDataDir(engine: string): string;
  getBinaryExtension(): string; // '.exe' | ''

  // PATH manipulation
  addToPath(dir: string): Promise<void>;
  removeFromPath(dir: string): Promise<void>;
  getPathEntries(): Promise<string[]>;

  // Binary resolution
  resolveExecutablePath(binaryName: string, installDir: string): string;

  // Download sources
  getPhpDownloadUrl(version: string): string;
  getDatabaseDownloadUrl(engine: string, version: string): string;

  // Archive extraction
  extractZip(zipPath: string, destDir: string): Promise<void>;

  // Future slots (throw 'not implemented' until needed)
  getHostsFilePath(): string; // Phase 4
  getAutoStartDir(): string; // Phase 2
}
```

**What's abstracted (cheap now, expensive later if skipped):**

| Concern                                                         | Rationale                                                                                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extractZip()`                                                  | PowerShell `Expand-Archive` is Windows-only. macOS/Linux use `unzip`. A single method call from services prevents this leaking.                         |
| `resolveExecutablePath()` / `getBinaryExtension()`              | `mysql.exe` vs `mysql`. Trivial one-liners that prevent `.exe` suffixes from appearing in service code.                                                 |
| `getDefaultRuntimeInstallDir()` / `getDefaultDatabaseDataDir()` | `%APPDATA%` vs `~/Library/Application Support` vs `~/.config`. Electron's `app.getPath` abstracts the base path, but install layout conventions differ. |
| `getPhpDownloadUrl()`                                           | `windows.php.net` vs php.net macOS builds vs distro package managers. Centralizing URL construction avoids URL strings in service code.                 |

**What's NOT abstracted (already cross-platform or too expensive to do now):**

| Concern                      | Rationale                                                                           |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| Process spawning             | `execa` and `child_process.execFile` are already cross-platform. No adapter needed. |
| File I/O                     | `fs.readFile`, `fs.writeFile`, streams — cross-platform.                            |
| SQLite                       | `better-sqlite3` — cross-platform native module.                                    |
| Caddy/Nginx proxy management | Entirely Phase 4. The adapter can grow a method then.                               |
| Downloads (streaming)        | `fetch()` + `pipeline` — cross-platform.                                            |

**Windows implementation (`electron/platform/win32.ts`):**

```ts
export class Win32PlatformAdapter implements IPlatformAdapter {
  readonly platform = "win32" as const;
  readonly displayName = "Windows";

  getBinaryExtension(): string {
    return ".exe";
  }

  resolveExecutablePath(binaryName: string, installDir: string): string {
    return join(installDir, `${binaryName}.exe`);
  }

  getDefaultRuntimeInstallDir(runtime: string): string {
    return join(app.getPath("userData"), runtime);
  }

  async extractZip(zipPath: string, destDir: string): Promise<void> {
    await execFileAsync("powershell", [
      "-Command",
      `Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force`,
    ]);
  }

  // ... etc
}
```

## Consequences

**Easier:**

- macOS/Linux support in Phase 6 is two new classes (`DarwinPlatformAdapter`, `LinuxPlatformAdapter`) + container registration swap. Zero service code changes.
- Testing: tests inject a `TestPlatformAdapter` stub that doesn't touch the real filesystem.
- Auditing: every OS-dependent operation is in one file per platform, not scattered across services.

**Harder:**

- The `IPlatformAdapter` interface grows over time as new OS-coupled features are added. This is a feature, not a bug — it centralizes the surface area.
- Adding a method to the interface requires adding a stub to every existing adapter. With 3 total adapters (win32, darwin, linux), this is minimal overhead.

**Follow-up:**

- Define `IPlatformAdapter` interface immediately. (Done — Phase 1)
- Implement `Win32PlatformAdapter` for MVP. (Done — Phase 1)
- Refactor `PhpManager` to receive `IPlatformAdapter` via constructor. (Done — Phase 1)
- Defer `DarwinPlatformAdapter` and `LinuxPlatformAdapter` to Phase 6.
- Defer `getHostsFilePath()` until Phase 4.
- **Phase 2 additions** (per [ADR-0009](../adr/0009-extension-manager-scope-boundary.md)): Add `resolveExtensionFileName(name: string): string` for extension DLL/SO name resolution.
- **Phase 2 additions** (auto-start feature): Add `createAutoStartEntry(name: string, targetPath: string, args?: string[]): Promise<void>` and `removeAutoStartEntry(name: string): Promise<void>` for OS-specific boot registration.
- `getAutoStartDir()` already implemented on Win32; `createAutoStartEntry`/`removeAutoStartEntry` wrap the actual shortcut/plist/desktop-file creation around that path.

### Phase 4 additions (advanced sites, HTTPS, CLI)

The interface grows again as Phase 4 introduces the most OS-coupled features yet (see [ADR-0011](../adr/0011-privileged-operation-elevation.md), [ADR-0012](../adr/0012-site-domain-management-single-source-of-truth.md), [ADR-0015](../adr/0015-cli-companion-architecture.md)):

| Method                                                      | Concern                      | Win32 behavior                                   |
| ----------------------------------------------------------- | ---------------------------- | ------------------------------------------------ |
| `readHostsFile()` / `writeHostsFile(content)`               | Hosts I/O                    | raw read; write to temp + elevated `cmd /c copy` |
| `getHostsFileEol()` / `getLoopbackHost()`                   | hosts formatting             | `\r\n` / `127.0.0.1`                             |
| `getProxyDir()` / `getCertStoreDir()`                       | Caddy config + mkcert CAROOT | under `%APPDATA%/Horde`                          |
| `getCaddyDownloadUrl(v)` / `getMkcertDownloadUrl(v)`        | binary sources               | GitHub releases                                  |
| `getComposerPharUrl()`                                      | cross-platform composer      | getcomposer.org phar                             |
| `installCaTrust(certPath)`                                  | trust root CA                | elevated `certutil -addstore -f Root`            |
| `canBindLowPorts()`                                         | 80/443 privilege             | `true` (Windows non-admin)                       |
| `elevate(command, args)`                                    | run privileged op            | UAC via `Start-Process -Verb RunAs`              |
| `installCliShim` / `uninstallCliShim` / `getCliInstallPath` | CLI on PATH                  | `.cmd` shim + PATH entry                         |
| `killProcessTree(pid)`                                      | process-tree kill            | `taskkill /T /F`                                 |

darwin/linux implementations are stubbed (`throw 'not implemented'`) and filled in Phase 6 — the interface grows, but the boundary never leaks into services.

## Alternatives Considered

- **No abstraction — use `process.platform` branches in service code.**
  - **Rejected because:** Every service that touches paths, URLs, or extraction gains platform branches. Porting becomes a grep-and-replace exercise across the entire codebase. The cost of the abstraction (one interface, one class per platform) is far lower than the cost of retroactive untangling.
- **Per-concern abstractions** (`IPathResolver`, `IZipExtractor`, `IUrlBuilder`, etc.).
  - **Rejected because:** Leads to interface explosion. A service needing paths + extraction + URLs receives 3 injected dependencies instead of 1. The cohesion argument ("platform operations belong together") outweighs the single-responsibility argument at this scale.
- **Use a library** (e.g., `appdata-path`, `platform-folders`).
  - **Rejected because:** Electron's `app.getPath` already handles base paths. The platform-specific parts (URLs, extraction commands, PATH manipulation commands) have no off-the-shelf library that covers all of them. A custom adapter is less dependency surface area.
