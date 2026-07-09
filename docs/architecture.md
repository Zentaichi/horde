# Architecture & Design Decisions

## High-Level Architecture

The application follows a **two-process model** (Electron main + renderer) with strict separation enforced by `contextBridge`.

```
Renderer (Vue 3)  <--IPC-->  Main Process (Node.js services)
       |                          |
   Pinia Stores              better-sqlite3
```

- **Renderer** never imports Node.js modules; it uses a typed `window.electronAPI` object exposed by the preload script.
- **Main process** contains all business logic, filesystem operations, and child process management.
- Communication is request/response plus push events via Electron's `ipcMain`/`ipcRenderer`.

## Frontend: Feature Sliced Design

We chose **Feature Sliced Design** (FSD) because:

1. **Isolation** — Every feature (PHP, MySQL) is a self-contained module with its own API layer, components, and composables. This prevents tight coupling and allows independent development/testing.
2. **Scalability** — Adding PostgreSQL later means adding a new feature module `postgres/` that follows the same interface contracts; no existing code needs to change.
3. **Shared layer** keeps UI consistency (shadcn-vue components) while avoiding duplication.

Adopted via [ADR-0001: Feature Sliced Design for Frontend](adr/0001-feature-sliced-design.md).

### Layer Rules

- `pages/` can import from `features/`, `widgets/`, `entities/`, `shared/`.
- `features/` can import from `entities/`, `shared/` (not from other features).
- `widgets/` can combine multiple `entities/` and `features/`.
- `entities/` and `shared/` have no dependencies on upper layers.

### Directory Layout

```
electron/               # Main process
  main.ts               # Entry point, DI container setup, window creation
  preload.ts            # contextBridge exposure
  platform/             # OS-specific implementations
    IPlatformAdapter.ts # Platform abstraction interface
    win32.ts            # Windows implementation
  services/
    interfaces/         # Shared contracts
      IRuntimeManager.ts
      IPhpManager.ts
      IDatabaseEngine.ts
      IMySqlManager.ts
    php-manager.ts      # Implements IPhpManager
    mysql-manager.ts    # Implements IMySqlManager
  ipc/
    php.handlers.ts
    mysql.handlers.ts
  types/
    ipc.d.ts            # Typed IPC contract

src/                    # Renderer process
  app/                  # Global setup, router, Pinia stores
  pages/                # Route-level components
  features/
    php/                # PHP feature module
    mysql/              # MySQL feature module
  widgets/              # Composition of multiple entities/features
  entities/             # Plain business models
  shared/               # Reusable UI kit and utilities
```

## Backend: Service Layer with Dependency Injection

Main process services implement shared interfaces (`IPhpManager`, `IMySqlManager`, `IDatabaseEngine`, `IRuntimeManager`). A lightweight DI container (`tsyringe`) manages dependencies and facilitates unit testing with mocked implementations.

> **Status:** DI is designed and adopted via [ADR-0002](adr/0002-service-layer-di-strategy.md) but not yet fully wired. Currently `main.ts` instantiates `PhpManager` directly. The refactor to container-based resolution is an early Phase 1 task.

### Service Boundaries

| Service | Interface | Responsibilities |
|---------|-----------|-----------------|
| `PhpManager` | `IPhpManager` (extends `IRuntimeManager`) | Download, list, switch, run built-in server |
| `MySqlManager` | `IMySqlManager` (extends `IDatabaseEngine`) | Download portable MySQL, initialize data directory, start/stop process, create databases |
| `Downloader` | (utility) | Generic binary download with progress callbacks (used by both managers) |
| `SettingsStore` | (concrete) | Abstraction over `better-sqlite3` for app configuration |
| `Win32PlatformAdapter` | `IPlatformAdapter` | OS-specific paths, PATH manipulation, ZIP extraction, binary resolution |

All OS-coupled operations flow through `IPlatformAdapter` so that services never branch on `process.platform`. See [ADR-0004](adr/0004-platform-abstraction-boundary.md).

### Engine Registry

Database engines are resolved by name at runtime. The DI container maps `'mysql'` to `IMySqlManager`, and future engines (`'postgresql'`, `'mariadb'`) register against the same `IDatabaseEngine` token with a discriminator. This means Phase 3 adds engines without changing any Phase 1 or Phase 2 code. See [ADR-0003](adr/0003-multi-engine-database-abstraction.md).

## Platform Abstraction

All OS-coupled concerns are isolated behind `IPlatformAdapter`:

- Filesystem layout (install directories, data directories)
- PATH manipulation (registry / shell profiles)
- Binary resolution (`.exe` suffix)
- Download source URLs (windows.php.net vs php.net macOS builds)
- Archive extraction (PowerShell vs `unzip`)
- Future: hosts file path, auto-start directory

The interface is defined now; only the Windows implementation is built for MVP. macOS and Linux implementations are deferred to Phase 6. See [ADR-0004](adr/0004-platform-abstraction-boundary.md).

## IPC Contract

All IPC channels are defined as typed request/response pairs in `electron/types/ipc.d.ts`. The preload script exposes a minimal API object to the renderer:

```ts
interface ElectronAPI {
  php: {
    listAvailable(): Promise<string[]>;
    listInstalled(): Promise<PhpVersion[]>;
    download(version: string, onProgress: (pct: number) => void): Promise<void>;
    switchGlobal(version: string): Promise<void>;
    getActiveVersion(): Promise<string | null>;
    uninstall(version: string): Promise<void>;
    runDevServer(docRoot: string, port: number): Promise<void>;
    stopDevServer(): Promise<void>;
    getDevServerStatus(): Promise<{ running: boolean; port?: number }>;
    listExtensions(version: string): Promise<{ name: string; enabled: boolean }[]>;
  };

  databases: {
    listEngines(): Promise<string[]>;
    download(engine: string, version: string, onProgress: (pct: number) => void): Promise<void>;
    listInstalledVersions(engine: string): Promise<string[]>;
    initialize(config: DatabaseInstanceConfig): Promise<void>;
    start(instanceId: string): Promise<void>;
    stop(instanceId: string): Promise<void>;
    restart(instanceId: string): Promise<void>;
    getStatus(instanceId: string): Promise<DatabaseInstanceStatus>;
    listInstances(engine: string): Promise<DatabaseInstanceStatus[]>;
    removeInstance(instanceId: string): Promise<void>;
    createDatabase(instanceId: string, name: string): Promise<void>;
    dropDatabase(instanceId: string, name: string): Promise<void>;
    listDatabases(instanceId: string): Promise<string[]>;
  };

  events: {
    on(channel: string, callback: (...args: any[]) => void): () => void;
  };
}
```

Key design decisions:
- `databases.*` is engine-agnostic — the renderer never imports `mysql` or `postgres` specifically. New engines are additive.
- Every database channel uses `instanceId` rather than relying on a singleton. This supports multiple simultaneous instances in Phase 3 without breaking changes.
- `events.on()` returns an unsubscribe function to prevent listener leaks.
- Phase 2 methods (`runDevServer`, `listExtensions`, etc.) exist on the typed contract from day one but throw `'not implemented'` until built. This prevents the renderer from needing API shape changes when features are added.

## Data Flow

1. User clicks "Download PHP 8.2" → renderer calls `window.electronAPI.php.download(...)`.
2. IPC handler in main process resolves `IPhpManager` from the DI container.
3. `PhpManager` delegates URL resolution and extraction to `IPlatformAdapter`, downloads via `Downloader`, and emits progress events back to the renderer via a push channel.
4. On completion, main process writes the new version to SQLite and sends a `php:version-installed` event.
5. Pinia store updates its list reactively.

## Testing Strategy

- **Unit tests**: Vitest for services, composables, and utilities. Mock `IPlatformAdapter` and `IDatabaseEngine` interfaces.
- **Integration tests**: Test IPC handlers with a temporary SQLite database and a stubbed platform adapter.
- **E2E tests**: Playwright + Electron launch; mock main process services to verify UI flows.

## Packaging & Distribution

We use `electron-builder` with NSIS for Windows. The installer bundles all Node.js dependencies; binaries (PHP, MySQL) are fetched on first use to keep the installer small. Cross-platform packaging (DMG, AppImage) is deferred to Phase 6.

## Related Documents

- [ADR-0001](adr/0001-feature-sliced-design.md) — Frontend architecture decision
- [ADR-0002](adr/0002-service-layer-di-strategy.md) — DI & service boundaries
- [ADR-0003](adr/0003-multi-engine-database-abstraction.md) — Engine-agnostic IPC
- [ADR-0004](adr/0004-platform-abstraction-boundary.md) — Platform abstraction
- [Requirements](requirements.md)
- [Roadmap](roadmap.md)
