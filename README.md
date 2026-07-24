# Horde — Local PHP & Database Version Manager

**Horde** is a desktop application that lets you install, switch, and manage multiple PHP versions alongside portable MySQL servers — all without Docker. Think Laravel Herd + DBngin, built for Windows first with cross-platform architecture from day one.

> **Status:** Phase 2 complete — Windows-only; macOS and Linux planned for Phase 6.

## Features

### PHP Management
- Download, list, globally switch, uninstall PHP versions (Windows binaries)
- Per-project PHP version via `.php-version` file (read-only discovery)
- Extension manager UI (list and toggle bundled extensions)
- `php.ini` editing for extension toggles

### Database Management
- Download portable MySQL versions, create per-instance data directories
- Start/stop/restart MySQL instances on configurable ports
- Create/delete databases via UI
- Multiple simultaneous instances across different versions/ports

### Dev Server
- Built-in `php -S` development server per project
- Real-time log streaming

### Platform & Developer Experience
- Dashboard with status cards (PHP, Databases, Projects, Dev Servers)
- System tray with service status indicators and quick actions
- Auto-start services on Windows boot
- Light/dark theme toggle
- Settings persistence via SQLite
- `IPlatformAdapter` abstraction — macOS/Linux is one class per platform

## Planned (Phase 3+)

- PostgreSQL and MariaDB engine support
- Database import/export (SQL dump)
- Full `php.ini` text editor
- Built-in HTTPS via `mkcert` + Caddy reverse proxy
- Local domain mapping & hosts file integration
- CLI companion tool (`horde` command)
- **macOS & Linux support** (Phase 6 — architecture seeded in Phase 1)

Full feature tracking: [docs/feature-parity.md](docs/feature-parity.md)
Roadmap: [docs/roadmap.md](docs/roadmap.md)

## Tech Stack

- **Desktop Shell:** Electron (main + renderer)
- **Renderer:** Vue 3 (Composition API, TypeScript), Pinia, TailwindCSS, shadcn-vue
- **Main Process:** Node.js, better-sqlite3, execa, electron-log, tsyringe (DI)
- **Testing:** Vitest, Playwright
- **CI/CD:** GitHub Actions (Windows build + installer)

## Architecture

The codebase follows **Feature Sliced Design** (frontend) with a **service layer + DI container** (backend) and a **platform abstraction boundary** for cross-platform readiness.

```
electron/               # Main process
  main.ts               # Entry point, DI container, window creation
  preload.ts            # contextBridge (typed IPC)
  tray.ts               # System tray icon and context menu
  platform/             # OS-specific adapters
    IPlatformAdapter.ts # Platform abstraction interface (15 methods)
    win32/              # Windows implementation (PowerShell, reg query, setx)
  services/
    interfaces/         # Shared contracts
      IPhpManager.ts    # PHP service contract
      IDatabaseEngine.ts # Multi-engine database contract (18 methods)
      IProjectManager.ts # Project CRUD + .php-version scanning
      IDevServerManager.ts # Built-in dev server lifecycle
      IExtensionManager.ts # Bundled extension listing and toggling
      IServiceRegistry.ts  # Unified service status for tray/auto-start
    php-manager.ts      # Implements IPhpManager
    mysql-manager.ts    # Implements IDatabaseEngine
    project-manager.ts  # Implements IProjectManager
    dev-server-manager.ts # Implements IDevServerManager + IServiceProvider
    extension-manager.ts  # Implements IExtensionManager
    database-registry.ts  # Multi-engine instance tracker + IServiceProvider
    service-registry.ts   # Aggregated service status
    settings-store.ts     # SQLite persistence (settings, instances, projects)
  ipc/
    php.handlers.ts     # php:* channels
    database.handlers.ts # databases:* channels
    project.handlers.ts # projects:* channels
    devserver.handlers.ts # devserver:* channels
    extensions.handlers.ts # extensions:* channels
    settings.handlers.ts  # settings:get/set
    autostart.handlers.ts # autostart:* channels
  types/
    php.ts              # PhpVersion, DownloadProgress
    database.ts         # DatabaseInstanceConfig, DatabaseInstanceStatus
    project.ts          # Project
    devserver.ts        # DevServerStatus
    extension.ts        # ExtensionInfo

src/                    # Renderer process
  app/                  # Global setup, router, App shell
  pages/                # Route-level components (Dashboard, PHP, Databases, Projects)
  features/
    php/                # PHP feature module (store, components)
    database/           # Database feature module (store, components)
    projects/           # Project management (store, components)
    devserver/          # Dev server (store, components)
    extensions/         # Extension manager (store, components)
  widgets/              # Cross-feature compositions (status cards: PHP, DB, Projects, Dev Server)
  shared/               # Reusable UI kit (shadcn-vue), types, composables
```

Key architectural decisions are documented as ADRs under [docs/adr/](docs/adr/):

| ADR | Topic |
|-----|-------|
| [ADR-0001](docs/adr/0001-feature-sliced-design.md) | Feature Sliced Design for frontend |
| [ADR-0002](docs/adr/0002-service-layer-di-strategy.md) | Service layer & tsyringe DI |
| [ADR-0003](docs/adr/0003-multi-engine-database-abstraction.md) | Engine-agnostic database IPC |
| [ADR-0004](docs/adr/0004-platform-abstraction-boundary.md) | Platform abstraction (IPlatformAdapter) |
| [ADR-0005](docs/adr/0005-download-utility-consolidation.md) | Single canonical download utility |
| [ADR-0006](docs/adr/0006-project-management-scope-boundary.md) | Project model scope boundary & dev server integration |
| [ADR-0007](docs/adr/0007-service-registry-abstraction.md) | Unified process status via ServiceRegistry |
| [ADR-0008](docs/adr/0008-settings-store-consolidation.md) | SettingsStore as canonical persistence layer |
| [ADR-0009](docs/adr/0009-extension-manager-scope-boundary.md) | Extension manager (bundled only, no PECL) |

Full architecture: [docs/architecture.md](docs/architecture.md)

## Prerequisites

- **[Node.js](https://nodejs.org/)** 24+
- **[Python](https://www.python.org/downloads/)** 3.9+ — required by `node-gyp` to compile native modules (`better-sqlite3`). Ensure `python` is available in your PATH.
- **Windows:** [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with the "Desktop development with C++" workload (includes MSVC v143 and Windows 10/11 SDK). Required to compile `better-sqlite3`'s native addon from source.

> The `postinstall` script runs `electron-rebuild` automatically after `npm install` to rebuild native modules against Electron's Node ABI. If you see errors about missing `better_sqlite3.node`, verify the prerequisites above are met and run `npx electron-rebuild -f -w better-sqlite3`.

## Quick Start (Development)

```bash
# Install dependencies (including native module rebuild)
npm install

# Start Electron + Vite dev server
npm run dev

# Run tests
npm test

# Build Windows installer
npm run build
```
