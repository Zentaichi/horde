# Horde — Local PHP & Database Version Manager

**Horde** is a desktop application that lets you install, switch, and manage multiple PHP versions alongside portable MySQL servers — all without Docker. Think Laravel Herd + DBngin, built for Windows first with cross-platform architecture from day one.

> **Status:** MVP (Phase 1) complete — 18/18 items done. Windows-only for now; macOS and Linux planned for Phase 6.

## Core MVP Features (Phase 1)

- **PHP Version Manager**
  Download, list, globally switch, uninstall, and reveal PHP versions (Windows binaries from windows.php.net).
- **MySQL Portable Server**
  Download multiple MySQL versions, create per-instance data directories, start/stop instances on configurable ports, create/delete databases via UI, with simultaneous multi-instance support and persistent state across restarts.
- **Dashboard UI**
  Real-time status cards for PHP (active version, installed count) and databases (running instances, ports), with light/dark theme toggle.
- **Platform Abstraction**
  All OS-specific logic (PATH, ZIP extraction, binary URLs) routed through `IPlatformAdapter` — adding macOS/Linux requires writing one class per platform, zero service code changes.

## Planned (Post-MVP)

- Per-project PHP version via `.php-version` file
- PHP extension manager & `php.ini` editor
- Built-in development server with logs
- System tray with quick actions & service status
- Auto-start services on boot
- Settings persistence with SQLite
- PostgreSQL and MariaDB engine support
- Database import/export (SQL dump)
- Create / Delete databases via UI
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
  platform/             # OS-specific adapters
    IPlatformAdapter.ts # Platform abstraction interface (13 methods)
    win32/              # Windows implementation (PowerShell, reg query, setx)
  services/
    interfaces/         # Shared contracts
      IPhpManager.ts    # PHP service contract
      IDatabaseEngine.ts # Multi-engine database contract (18 methods)
    php-manager.ts      # Implements IPhpManager
    mysql-manager.ts    # Implements IDatabaseEngine
    database-registry.ts # Multi-engine instance tracker
  ipc/
    php.handlers.ts     # php:* channels
    database.handlers.ts # databases:* channels
  types/
    php.ts              # PhpVersion, DownloadProgress
    database.ts         # DatabaseInstanceConfig, DatabaseInstanceStatus

src/                    # Renderer process
  app/                  # Global setup, router, App shell
  pages/                # Route-level components (Dashboard, PHP, Databases)
  features/
    php/                # PHP feature module (store, components)
    database/           # Database feature module (store, components)
  widgets/              # Cross-feature compositions (status cards)
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
