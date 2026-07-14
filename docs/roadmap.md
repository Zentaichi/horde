# Roadmap (Subject to Change)

## Phase 1 — Core MVP (Current)

**Goal:** Demonstrable PHP + MySQL on Windows with architecture that survives Phase 3 without rework.

- [x] Project scaffolding (Electron + Vue 3 + Tailwind + Feature Sliced Design)
- [x] shadcn-vue component library installed (Button, Card, Progress, Badge) + theme CSS infrastructure
- [x] `IPlatformAdapter` interface (12 methods: PATH, ZIP, URLs, binary resolution) + `Win32PlatformAdapter` implementation
- [x] PHP download URL routing via `IPlatformAdapter` (releases URL, download URL construction, extraction, PATH I/O all routed through adapter)
- [x] PHP version list & download from windows.php.net (with progress bar: speed, ETA, byte counter)
- [x] tsyringe DI container wired (services resolved from container; IPC handlers resolve via token)
- [x] Global PHP version switching via PATH (user PATH via setx; reads current PATH from registry, removes old Horde entries, adds new version)
- [x] `IDatabaseEngine` interface (18 methods: version lifecycle + instance lifecycle + data ops) + `DatabaseRegistry` (multi-engine instance tracking)
- [x] MySQL portable download & initialise (`MySqlManager` implements `IDatabaseEngine`: download via adapter, `mysqld --initialize-insecure`, spawn/kill process, port check)
- [x] MySQL start/stop process control (spawn with SIGTERM grace + SIGKILL fallback, status polling)
- [x] Engine-agnostic IPC contract: `databases.*` (list-engines, download, initialize, start/stop/get-status, list-instances, remove-instance, onDownloadProgress)
- [x] Dashboard UI with real-time status (PhpStatusWidget + DatabaseStatusWidget: green/gray dots, running instance counts, direct nav links)
- [x] Settings persistence with SQLite
- [x] Light/dark theme toggle (useTheme composable + ThemeToggle button in nav bar)
- [x] Unit and basic E2E tests
- [x] GitHub Actions CI building Windows installer

> **Cross-platform seed (do now, cheap):** `IPlatformAdapter` interface with Windows implementation only. All OS-specific paths, URLs, and extraction go through the adapter. macOS/Linux adapters are single-class files written in Phase 6 — no Phase 1 code needs to change when they arrive.

## Phase 2 — Polish & Developer UX

- [ ] Per-project PHP version with `.php-version`
- [ ] Extension manager UI
- [ ] `php.ini` editor
- [ ] Built-in development server (with logs)
- [ ] System tray with quick actions & service status indicators
- [ ] Auto-start services on Windows boot
- [ ] E2E test coverage for PHP + MySQL workflows

## Phase 3 — Full Database Suite

- [ ] PostgreSQL engine (implements `IDatabaseEngine` — additive, zero refactors of Phase 1/2 code)
- [ ] MariaDB engine (same)
- [ ] Database import/export (SQL dump)
- [ ] Multiple simultaneous database instances (IPC already supports `instanceId` from Phase 1)
- [ ] Cross-engine status dashboard

> **Reality check:** If `IDatabaseEngine` is implemented in Phase 1, Phase 3 reduces to writing two new `implements IDatabaseEngine` classes plus UI. If skipped, Phase 3 includes a costly refactor of the MySQL IPC layer and renderer bindings.

## Phase 4 — Advanced Herd-like Features

- [ ] Local domain mapping and hosts file integration
- [ ] Reverse proxy with Caddy (or Nginx) for automatic SSL
- [ ] Built-in HTTPS via mkcert
- [ ] Project quick-create from Laravel, Symfony, etc.
- [ ] CLI companion tool (`horde` command)

## Phase 5 — Maintenance & Community

- [ ] Auto-updater for the app itself
- [ ] User-configurable binary mirrors
- [ ] Plugin system for third-party services
- [ ] Internationalisation (i18n)
- [ ] Official website and documentation

## Phase 6 — Cross-Platform Support

**Goal:** macOS and Linux support, seeded by the `IPlatformAdapter` abstraction built in Phase 1.

- [ ] `DarwinPlatformAdapter` — macOS paths, PATH (shell profiles), ZIP extraction, PHP download URLs, auto-start (launchd plists), hosts path
- [ ] `LinuxPlatformAdapter` — Linux equivalents
- [ ] DMG + AppImage packaging (`electron-builder` config)
- [ ] Platform-specific E2E tests (Playwright on macOS/Linux CI)
- [ ] Cross-platform installer documentation

> **Deferred by design.** Phase 1 built the abstraction boundary; this phase writes the implementations. No Phase 1–5 code needs rewriting — the adapter is swapped at startup via DI container configuration.

> Updated last: 2026-07-14 (Phase 1 complete — Settings persistence, Create/Delete databases, Unit/E2E tests, CI/CD)
