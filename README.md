# Horde – Local PHP & Database Version Manager for Windows

**Horde** is a desktop application that lets you install, switch, and manage multiple PHP versions alongside portable MySQL/MariaDB and PostgreSQL servers—all without Docker. Think Laravel Herd + DBngin, built with modern web technologies and a clean architecture.

> **Status:** MVP (simplified core) under active development.  

## Core MVP Features

- **PHP Version Manager**  
  Download, list, and globally switch PHP versions (Windows binaries from windows.php.net).
- **MySQL Portable Server**  
  Download, initialise, and start/stop a MySQL instance on a configurable port.
- **Dashboard UI**  
  Real‑time status of installed versions and running services.
- **Local SQLite Store**  
  All app settings and state are persisted in a single file.

## Planned Parity (Post‑MVP)

- Per‑project PHP version (`.php-version` file)
- PHP extension manager & `php.ini` editor
- PostgreSQL, MariaDB support
- Built‑in HTTPS via `mkcert`
- System tray and auto‑start

## Tech Stack

- **Desktop Shell:** Electron (main + renderer)
- **Renderer:** Vue 3 (Composition API, TypeScript), Pinia, TailwindCSS, shadcn‑vue
- **Main Process:** Node.js, better‑sqlite3, execa, electron‑log
- **Testing:** Vitest, Playwright
- **CI/CD:** GitHub Actions (Windows build + installer)

## Architecture – Feature Sliced Design

The codebase is organised for scalability and testability:

- `electron/` – main process (IPC, services, process management)
- `src/app/` – global setup, router, Pinia stores
- `src/pages/` – route‑level components
- `src/features/php/` – self‑contained PHP feature (API wrappers, components, composables)
- `src/features/mysql/` – MySQL feature module
- `src/widgets/` – composition of multiple entities/features
- `src/entities/` – plain business models
- `src/shared/` – reusable UI kit and utilities

Full architecture decisions are documented in [docs/architecture.md](docs/architecture.md).

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