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
    IPlatformAdapter.ts # Platform abstraction interface (15 methods)
    win32/
      Win32PlatformAdapter.ts
  services/
    interfaces/
      IPhpManager.ts
      IDatabaseEngine.ts
      IProjectManager.ts
      IDevServerManager.ts
      IExtensionManager.ts
      IServiceRegistry.ts
    php-manager.ts      # Implements IPhpManager
    mysql-manager.ts    # Implements IDatabaseEngine
    project-manager.ts  # Implements IProjectManager
    dev-server-manager.ts # Implements IDevServerManager + IServiceProvider
    extension-manager.ts  # Implements IExtensionManager
    database-registry.ts  # Multi-engine instance tracker + IServiceProvider
    service-registry.ts   # Aggregated service status for tray/auto-start
    settings-store.ts     # SQLite persistence (settings, instances, projects)
  ipc/
    php.handlers.ts
    database.handlers.ts
    project.handlers.ts
    devserver.handlers.ts
    extensions.handlers.ts
    settings.handlers.ts
  types/
    php.ts              # PhpVersion, DownloadProgress
    database.ts         # DatabaseInstanceConfig, DatabaseInstanceStatus
    project.ts          # Project
    devserver.ts        # DevServerStatus
    extension.ts        # ExtensionInfo
  utils/
    download.ts         # Shared download utility (single source)

src/                    # Renderer process
  app/                  # Global setup, router, App shell
    App.vue             # App shell with nav bar
    router.ts           # Route definitions
    main.ts             # App entry, Pinia setup
  pages/
    DashboardPage.vue
    PhpManagerPage.vue
    DatabasePage.vue
    ProjectsPage.vue
  features/
    php/                # PHP feature module
      stores/           # Pinia store
      components/       # UI components
    database/           # Database feature module (engine-agnostic)
      stores/
      components/
    projects/           # Project management feature module
      stores/
      components/
    devserver/          # Dev server feature module
      stores/
      components/
    extensions/         # Extension manager feature module
      stores/
      components/
  widgets/              # Composition of multiple features
    PhpStatusWidget.vue
    DatabaseStatusWidget.vue
    ProjectStatusWidget.vue
    DevServerStatusWidget.vue
  shared/               # Reusable UI kit, types, composables
    ui/                 # shadcn-vue components
    types/              # Shared type definitions
    composables/        # Shared composables
```

## Backend: Service Layer with Dependency Injection

Main process services implement shared interfaces (`IPhpManager`, `IDatabaseEngine`). A lightweight DI container (`tsyringe`) manages dependencies and facilitates unit testing with mocked implementations.

> **Status:** DI is fully wired (ADR-0002 implemented). `main.ts` registers `IPlatformAdapter`, `IPhpManager`, `IDatabaseEngine:mysql`, and `DatabaseRegistry` via `container.registerSingleton`. IPC handlers resolve services from the container. All services receive `IPlatformAdapter` via constructor injection.

### Service Boundaries

| Service | Interface | Responsibilities |
|---------|-----------|-----------------|
| `PhpManager` | `IPhpManager` | PHP version list/download/switch/uninstall, PATH manipulation |
| `MySqlManager` | `IDatabaseEngine` | MySQL download/extract, instance initialize, start/stop process control, instance status |
| `DatabaseRegistry` | (concrete, singleton) + `IServiceProvider` | Multi-engine instance tracking, engine resolution by instanceId, implements `IServiceProvider` for tray/auto-start visibility |
| `ServiceRegistry` | (concrete, singleton) | Aggregates status from all `IServiceProvider` instances. Used by tray and auto-start. Orphan process reattach on startup. |
| `ProjectManager` | `IProjectManager` | Project CRUD, `.php-version` scanning (read-only), project persistence |
| `DevServerManager` | `IDevServerManager` + `IServiceProvider` | Dev server process lifecycle (`php -S`), log capture, port management. Registers with `ServiceRegistry`. |
| `ExtensionManager` | `IExtensionManager` | List bundled extensions, enable/disable via `php.ini` modification. Bundled only (no PECL). |
| `SettingsStore` | (concrete, singleton) | SQLite persistence: settings KV, instances, projects. Exposed to renderer via `settings:*` IPC. |
| `Win32PlatformAdapter` | `IPlatformAdapter` | OS-specific: PATH (reg query/setx), ZIP extraction (PowerShell), download URLs, binary extension, install directories, extension file names, auto-start shortcuts |

All OS-coupled operations flow through `IPlatformAdapter` so that services never branch on `process.platform`. See [ADR-0004](adr/0004-platform-abstraction-boundary.md).

### Engine Registry

Database engines are registered by token. The DI container maps `'IDatabaseEngine:mysql'` to `MySqlManager`. `DatabaseRegistry` resolves all registered engines at startup and delegates instance lifecycle calls (start/stop/getStatus) to the correct engine by instanceId. This means Phase 3 adds PostgreSQL and MariaDB without changing any Phase 1/2 code. See [ADR-0003](adr/0003-multi-engine-database-abstraction.md).

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

All IPC channels are defined as typed request/response pairs. The preload script exposes a minimal API object to the renderer via `contextBridge.exposeInMainWorld('electronAPI', ...)`.

```ts
interface ElectronAPI {
  php: {
    getAvailableVersions(): Promise<string[]>;
    getInstalledVersions(): Promise<PhpVersion[]>;
    downloadVersion(version: string): Promise<void>;
    getActiveVersion(): Promise<string | null>;
    switchGlobal(version: string): Promise<void>;
    uninstallVersion(version: string): Promise<void>;
    onDownloadProgress(version: string, callback: (p: DownloadProgress) => void): () => void;
  };

  databases: {
    listEngines(): Promise<string[]>;
    listAvailable(engine: string): Promise<string[]>;
    listInstalled(engine: string): Promise<string[]>;
    download(engine: string, version: string): Promise<void>;
    initialize(config: DatabaseInstanceConfig): Promise<void>;
    start(instanceId: string): Promise<void>;
    stop(instanceId: string): Promise<void>;
    getStatus(instanceId: string): Promise<DatabaseInstanceStatus>;
    listInstances(): Promise<DatabaseInstanceStatus[]>;
    removeInstance(instanceId: string): Promise<void>;
    uninstall(engine: string, version: string): Promise<void>;
    openInstallDir(engine: string, version: string): Promise<void>;
    createDatabase(instanceId: string, name: string): Promise<void>;
    dropDatabase(instanceId: string, name: string): Promise<void>;
    listDatabases(instanceId: string): Promise<string[]>;
    onDownloadProgress(engine: string, version: string, callback: (p: DownloadProgress) => void): () => void;
  };

  projects: {
    list(): Promise<Project[]>;
    add(name: string, path: string): Promise<Project>;
    remove(projectId: string): Promise<void>;
    scanPhpVersion(projectId: string): Promise<string | null>;
    scanAll(): Promise<void>;
    openDir(projectId: string): Promise<void>;
  };

  devserver: {
    start(projectId: string, port?: number): Promise<DevServerStatus>;
    stop(projectId: string): Promise<void>;
    getStatus(projectId: string): Promise<DevServerStatus | null>;
    listAll(): Promise<DevServerStatus[]>;
    getLogs(projectId: string, tail?: number): Promise<string[]>;
    onLog(projectId: string, callback: (line: string) => void): () => void;
  };

  extensions: {
    list(phpVersion: string): Promise<ExtensionInfo[]>;
    enable(phpVersion: string, extensionName: string): Promise<void>;
    disable(phpVersion: string, extensionName: string): Promise<void>;
  };

  settings: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
  };

  openDirectory(path: string): Promise<void>;
}
```

Key design decisions:
- `databases.*` is engine-agnostic — the renderer never imports `mysql` or `postgres` specifically. New engines are additive.
- `projects.*` uses discovery-only `.php-version` scanning (read from disk, never write). See [ADR-0006](adr/0006-project-management-scope-boundary.md).
- `devserver.*` references projects by ID but lives in its own IPC namespace and FSD module. Services register with `ServiceRegistry` for tray visibility. See [ADR-0007](adr/0007-service-registry-abstraction.md).
- `extensions.*` is limited to bundled extensions only (no PECL). See [ADR-0009](adr/0009-extension-manager-scope-boundary.md).
- `settings.*` provides a generic key-value persistence channel to the renderer. See [ADR-0008](adr/0008-settings-store-consolidation.md).
- Every database channel uses `instanceId` rather than relying on a singleton. This supports multiple simultaneous instances from day one.
- `onDownloadProgress()` and `onLog()` return an unsubscribe function to prevent listener leaks.
- Progress push channels follow the pattern `php:download-progress-{version}`, `database:download-progress-{engine}-{version}`, and `devserver:log-{projectId}`.

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
- [ADR-0005](adr/0005-download-utility-consolidation.md) — Download utility consolidation
- [ADR-0006](adr/0006-project-management-scope-boundary.md) — Project scope boundary & dev server integration
- [ADR-0007](adr/0007-service-registry-abstraction.md) — ServiceRegistry & unified process status
- [ADR-0008](adr/0008-settings-store-consolidation.md) — SettingsStore canonical persistence
- [ADR-0009](adr/0009-extension-manager-scope-boundary.md) — Extension manager scope (bundled only)
- [Requirements](requirements.md)
- [Roadmap](roadmap.md)
