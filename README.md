# Horde — Local PHP & Database Version Manager

**Horde** is a desktop application that lets you install, switch, and manage multiple PHP versions alongside portable MySQL, PostgreSQL, and MariaDB servers — all without Docker. Think Laravel Herd + DBngin, built for Windows first with cross-platform architecture from day one.

> **Status:** MVP (Phase 1) under active development. Windows-only for now; macOS and Linux planned for Phase 6.

## Core MVP Features (Phase 1)

- **PHP Version Manager**
  Download, list, and globally switch PHP versions (Windows binaries from windows.php.net).
- **MySQL Portable Server**
  Download, initialise, and start/stop a MySQL instance on a configurable port.
- **Dashboard UI**
  Real-time status of installed versions and running services, with light/dark theme toggle.
- **Local SQLite Store**
  All app settings and state are persisted in a single file.

## Planned Parity (Post-MVP)

- Per-project PHP version via `.php-version` file
- PHP extension manager & `php.ini` editor
- Built-in development server with logs
- System tray with quick actions & service status
- Auto-start services on boot
- PostgreSQL and MariaDB engine support
- Database import/export (SQL dump)
- Multiple simultaneous database instances
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
  platform/             # OS-specific adapters (IPlatformAdapter + win32/darwin/linux)
  services/             # Service classes (PhpManager, MySqlManager, Downloader)
    interfaces/         # Shared contracts (IRuntimeManager, IDatabaseEngine, IPhpManager)
  ipc/                  # IPC handler registrations
  types/ipc.d.ts        # Typed IPC contract

src/                    # Renderer process
  app/                  # Global setup, router, Pinia stores
  pages/                # Route-level components
  features/             # Self-contained feature modules (php/, mysql/, ...)
  widgets/              # Cross-feature compositions
  entities/             # Plain business models
  shared/               # Reusable UI kit and utilities
```

Key architectural decisions are documented as ADRs under [docs/adr/](docs/adr/):

| ADR | Topic |
|-----|-------|
| [ADR-0001](docs/adr/0001-feature-sliced-design.md) | Feature Sliced Design for frontend |
| [ADR-0002](docs/adr/0002-service-layer-di-strategy.md) | Service layer & tsyringe DI |
| [ADR-0003](docs/adr/0003-multi-engine-database-abstraction.md) | Engine-agnostic database IPC |
| [ADR-0004](docs/adr/0004-platform-abstraction-boundary.md) | Platform abstraction (IPlatformAdapter) |

Full architecture: [docs/architecture.md](docs/architecture.md)

## Quick Start (Development)

```bash
# Install dependencies
npm install

# Start Electron + Vite dev server
npm run dev

# Run tests
npm test

# Build Windows installer
npm run build
```
