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
  getBinaryExtension(): string;           // '.exe' | ''

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
  getHostsFilePath(): string;             // Phase 4
  getAutoStartDir(): string;              // Phase 2
}
```

**What's abstracted (cheap now, expensive later if skipped):**

| Concern | Rationale |
|---------|-----------|
| `extractZip()` | PowerShell `Expand-Archive` is Windows-only. macOS/Linux use `unzip`. A single method call from services prevents this leaking. |
| `resolveExecutablePath()` / `getBinaryExtension()` | `mysql.exe` vs `mysql`. Trivial one-liners that prevent `.exe` suffixes from appearing in service code. |
| `getDefaultRuntimeInstallDir()` / `getDefaultDatabaseDataDir()` | `%APPDATA%` vs `~/Library/Application Support` vs `~/.config`. Electron's `app.getPath` abstracts the base path, but install layout conventions differ. |
| `getPhpDownloadUrl()` | `windows.php.net` vs php.net macOS builds vs distro package managers. Centralizing URL construction avoids URL strings in service code. |

**What's NOT abstracted (already cross-platform or too expensive to do now):**

| Concern | Rationale |
|---------|-----------|
| Process spawning | `execa` and `child_process.execFile` are already cross-platform. No adapter needed. |
| File I/O | `fs.readFile`, `fs.writeFile`, streams — cross-platform. |
| SQLite | `better-sqlite3` — cross-platform native module. |
| Caddy/Nginx proxy management | Entirely Phase 4. The adapter can grow a method then. |
| Downloads (streaming) | `fetch()` + `pipeline` — cross-platform. |

**Windows implementation (`electron/platform/win32.ts`):**

```ts
export class Win32PlatformAdapter implements IPlatformAdapter {
  readonly platform = 'win32' as const;
  readonly displayName = 'Windows';

  getBinaryExtension(): string { return '.exe'; }

  resolveExecutablePath(binaryName: string, installDir: string): string {
    return join(installDir, `${binaryName}.exe`);
  }

  getDefaultRuntimeInstallDir(runtime: string): string {
    return join(app.getPath('userData'), runtime);
  }

  async extractZip(zipPath: string, destDir: string): Promise<void> {
    await execFileAsync('powershell', [
      '-Command',
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
- Define `IPlatformAdapter` interface immediately.
- Implement `Win32PlatformAdapter` for MVP.
- Refactor `PhpManager` to receive `IPlatformAdapter` via constructor.
- Defer `DarwinPlatformAdapter` and `LinuxPlatformAdapter` to Phase 6.
- Defer `getHostsFilePath()` and `getAutoStartDir()` implementations until their respective phases.

## Alternatives Considered

- **No abstraction — use `process.platform` branches in service code.**
  - **Rejected because:** Every service that touches paths, URLs, or extraction gains platform branches. Porting becomes a grep-and-replace exercise across the entire codebase. The cost of the abstraction (one interface, one class per platform) is far lower than the cost of retroactive untangling.
- **Per-concern abstractions** (`IPathResolver`, `IZipExtractor`, `IUrlBuilder`, etc.).
  - **Rejected because:** Leads to interface explosion. A service needing paths + extraction + URLs receives 3 injected dependencies instead of 1. The cohesion argument ("platform operations belong together") outweighs the single-responsibility argument at this scale.
- **Use a library** (e.g., `appdata-path`, `platform-folders`).
  - **Rejected because:** Electron's `app.getPath` already handles base paths. The platform-specific parts (URLs, extraction commands, PATH manipulation commands) have no off-the-shelf library that covers all of them. A custom adapter is less dependency surface area.
