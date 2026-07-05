# Architecture & Design Decisions

## High‑Level Architecture
The application follows a **two‑process model** (Electron main + renderer) with a strict separation enforced by `contextBridge`.

Renderer (Vue 3) <--IPC--> Main Process (Node.js services)

↑ ↓

Pinia Stores better-sqlite3


- **Renderer** never imports Node.js modules; it only uses a typed `window.electronAPI` object exposed by the preload script.
- **Main process** contains all business logic, file system operations, and child process management.
- Communication is request/response plus push events via Electron’s `ipcMain`/`ipcRenderer`.

## Frontend: Feature Sliced Design
We chose **Feature Sliced Design** because:

1. **Isolation** – Every feature (PHP, MySQL) is a self‑contained module with its own API layer, components, and composables. This prevents tight coupling and allows independent development/testing.
2. **Scalability** – Adding PostgreSQL later means adding a new feature module `postgres/` that follows the same interface contracts; no existing code needs to change.
3. **Shared layer** keeps UI consistency (shadcn‑vue components) while avoiding duplication.

### Layer Rules
- `pages/` can import from `features/`, `widgets/`, `entities/`, `shared/`.
- `features/` can import from `entities/`, `shared/` (not from other features).
- `widgets/` can combine multiple `entities/` and `features/`.
- `entities/` and `shared/` have no dependencies on upper layers.

## Backend: Service Layer with Dependency Injection
Main process services are plain TypeScript classes that implement interfaces (e.g., `IPhpManager`, `IMySqlManager`). We use a lightweight DI container (`tsyringe`) to manage dependencies and facilitate unit testing with mocked implementations.

### Service Boundaries
- `PhpManager`: download, list, switch, run built‑in server.
- `MySqlManager`: download portable MySQL, initialise data directory, start/stop process, create databases.
- `Downloader`: generic binary download with progress callbacks (used by both managers).
- `SettingsStore`: abstraction over `better-sqlite3` for app configuration.

## IPC Contract
All IPC channels are defined as typed request/response pairs in `electron/types/ipc.d.ts`. The preload script exposes a minimal API object to the renderer:

```ts
interface ElectronAPI {
  php: {
    listInstalled(): Promise<PhpVersion[]>;
    download(version: string, onProgress: (pct: number) => void): Promise<void>;
    switchGlobal(version: string): Promise<void>;
    getActiveVersion(): Promise<string | null>;
  },
  mysql: {
    start(config: MySqlConfig): Promise<void>;
    stop(): Promise<void>;
    getStatus(): Promise<ServiceStatus>;
    createDatabase(name: string): Promise<void>;
  }
}
```

## Data Flow
1. User clicks “Download PHP 8.2” → renderer calls `window.electronAPI.php.download(...)`.
2. IPC handler in main process calls `PhpManager.downloadVersion(...)`.
3. Downloader fetches the zip, extracts it, and emits progress events back to the renderer via a push channel.
4. On completion, main process writes the new version to SQLite and sends a php:version-installed event.
5. Pinia store updates its list reactively.

## Testing Strategy
- **Unit tests**: Vitest for services, composables, and utilities.
- **Integration tests**: Test IPC handlers with a temporary SQLite database.
- **E2E tests**: Playwright + Electron launch; mock main process services to verify UI flows.

## Packaging & Distribution
We use `electron-builder` with NSIS for Windows. The installer bundles all Node.js dependencies and a portable MySQL binary downloader (no binaries are shipped; they are fetched on first use to keep the installer small).