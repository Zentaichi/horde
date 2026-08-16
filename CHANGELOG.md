# Changelog

All notable changes to Horde are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). See [docs/versioning.md](docs/versioning.md) for the release process and the milestone-based tagging convention.

## [Unreleased]

## [0.6.0] - 2026-08-17

### Added

- Local domain mapping and hosts file integration (`SiteManager` + `HostsFile`) — per-project `.test` domains with backup/rollback, conflict detection, and stale-entry cleanup on project removal
- Reverse proxy via Caddy (`CaddyManager`) — managed service with validate-then-reload config, port fallback, tray/auto-start integration, orphan reattach
- Built-in HTTPS via mkcert (`MkcertManager`) — wildcard `*.test` certificate and elevated root-CA trust installation
- Project quick-create (`IScaffolder` registry) — Laravel and Symfony templates via composer, with log streaming and automatic project registration
- CLI companion (`horde` command) — `version`, `php-version`, `projects`, `sites`, `servers` over a loopback token-authenticated RPC endpoint; installable PATH shim
- Sites page with proxy/HTTPS/CLI status cards and per-project domain + SSL controls
- SQLite schema migration mechanism (`PRAGMA user_version`) with a migration adding Phase 4 project site fields
- `IPlatformAdapter` Phase 4 surface: hosts I/O, elevation, CA trust, proxy/cert dirs, Caddy/mkcert/composer URLs, CLI shims, `killProcessTree`

### Changed

- `Project` type gains `domains`, `sslEnabled`, `proxyPort` (ADR-0006 Phase 4 extension points)
- `projects:remove` routes cleanup through `SiteManager` so hosts entries and routes are removed with the project
- `DevServerManager.stop()` uses the platform adapter's process-tree kill instead of branching on `process.platform`
- Docs: architecture, requirements (FR9–FR13), feature-parity, roadmap updated for Phase 4

## [0.5.0] - 2026-08-04

### Added

- PostgreSQL engine (`PgManager`) implementing `IDatabaseEngine` interface
- MariaDB engine (`MariaDbManager`) implementing `IDatabaseEngine` interface
- `exportDatabase` / `importDatabase` methods on `IDatabaseEngine` contract
- MySQL export via `mysqldump` pipe and import via `mysql` stdin pipe
- MariaDB export via `mariadb-dump`/`mysqldump` and import via `mariadb`/`mysql`
- PostgreSQL export via `pg_dump` and import via `psql`
- `displayName` field on `DatabaseInstanceStatus` for human-readable engine names
- Download URL support for MariaDB (archive.mariadb.org) and PostgreSQL (get.enterprisedb.com) in platform adapter
- Engine selector dropdown on Database page for cross-engine management
- Import/Export buttons per database in InstanceList UI
- `showSaveDialog` / `showOpenDialog` IPC methods for file selection dialogs
- Branding (Phase 2.5): skull logo component, system tray icon, dormant/risen status language, brand guidelines in `docs/branding.md`

### Changed

- `DatabaseRegistry.listEngines()` returns `{ engine, displayName }[]` instead of `string[]`
- All UI components made engine-agnostic (removed hardcoded "MySQL" labels)
- `DatabasePage.vue` dynamically populates engine list with dropdown selection
- `DatabaseStatusWidget.vue` uses `displayName || engine` for cross-engine display

### Fixed

- Frontend `defineProps` changed to `const props = defineProps` in `InstanceList.vue` for script-level engine access
- Mock `MySqlManager` and unit tests updated for new interface methods and types
- Dev server `v-if`/`v-else` pairing and port badge placement
- Resolve system PATH for PHP; add scan/serve feedback; stop dev server on project removal
- Disable automatic publishing in build script (CI-owned release publishing)
- Cross-platform `emnapi` dependency entries in `package-lock.json`

## [0.4.0] - 2026-07-24

### Added

- `ProjectManager` + `projects:*` IPC — per-project PHP via `.php-version` (read-only discovery)
- `DevServerManager` + `devserver:*` IPC — built-in `php -S` server with real-time log streaming
- `ExtensionManager` + `extensions:*` IPC — bundled extension listing and enable/disable via `php.ini`
- System tray with quick actions and service status indicators
- Auto-start services on Windows boot (via `IPlatformAdapter.createAutoStartEntry`)
- `IServiceProvider` interface + `ServiceRegistry` aggregator for unified service status
- E2E test infrastructure (Playwright + mocked main-process services behind `HORDE_E2E_TEST` gate)

### Changed

- `SettingsStore` consolidated as the canonical persistence layer (settings, instances, projects)
- Shared `downloadFile()` consolidated into a single download utility
- `eslint-plugin-boundaries` + Feature Sliced Design import rules enforced in `src/`
- Phase 2 adapter methods (`resolveExtensionFileName`, auto-start entries) added to `IPlatformAdapter`

## [0.3.0] - 2026-07-14

### Added

- Project scaffolding: Electron + Vue 3 + TypeScript + Tailwind + Feature Sliced Design
- PHP version management — list, download (with progress: speed/ETA/bytes), extract, global switch, uninstall (Windows)
- `IPlatformAdapter` abstraction + `Win32PlatformAdapter` (PATH via registry/`setx`, ZIP extraction, URL routing)
- MySQL portable download, initialize, start/stop/restart, and per-instance data directories
- Engine-agnostic `databases:*` IPC contract and multi-engine `DatabaseRegistry`
- Create/delete/list databases via UI
- SQLite settings persistence with instance state survival across restarts
- Dashboard with real-time status widgets (PHP + Databases)
- Light/dark theme toggle
- tsyringe DI container wiring service layer
- Unit tests (Vitest), GitHub Actions CI building the Windows installer

## [Unreleased] Notes

> Only the sections above are released. Changes land in `[Unreleased]` until the next `v<minor>` tag.
