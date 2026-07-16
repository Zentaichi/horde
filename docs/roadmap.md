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

### Pre-Phase-2 Refactors (Implementation Order — Run First)

These refactors address architectural risks identified during Phase 1 review. Each enables one or more Phase 2 features and prevents code duplication, scope creep, and cross-feature coupling.

| Step | Priority | Refactor | Enables | ADR |
|------|----------|----------|---------|-----|
| 0.1 | P0 | Consolidate `downloadFile()` into one shared utility | All download features (extensions, dev server) | [ADR-0005](adr/0005-download-utility-consolidation.md) |
| 0.2 | P2 | Fix `filterHordeEntries` to use `this.basePath` instead of hardcoded strings | Correctness for all PATH operations | — |
| 0.3 | P2 | Delete stale artifacts (`src/shared/types/php.js`, `.js.map`) | Cleanliness | — |
| 0.4 | P2 | Install `eslint-plugin-boundaries` + FSD import rules | Prevents cross-feature imports in new modules | [ADR-0001](adr/0001-feature-sliced-design.md) (follow-up) |
| 1.1 | P1 | Add `resolveExtensionFileName()` to `IPlatformAdapter` | Extension manager | [ADR-0009](adr/0009-extension-manager-scope-boundary.md) |
| 1.2 | P1 | Add `createAutoStartEntry()` / `removeAutoStartEntry()` to `IPlatformAdapter` | Auto-start on boot | — |
| 2.1 | P1 | Add `settings:*` IPC channels (`get`/`set`) | All persistent preferences | [ADR-0008](adr/0008-settings-store-consolidation.md) |
| 2.2 | P1 | Add `projects` table to `SettingsStore` | Project persistence | [ADR-0006](adr/0006-project-management-scope-boundary.md), [ADR-0008](adr/0008-settings-store-consolidation.md) |
| 2.3 | P1 | Cache active PHP version in `settings` KV | Dashboard perf; dev server PHP resolution | [ADR-0008](adr/0008-settings-store-consolidation.md) |
| 3.1 | P0 | `IServiceProvider` interface + `ServiceRegistry` aggregator | Tray + auto-start unified service view | [ADR-0007](adr/0007-service-registry-abstraction.md) |
| 3.2 | P0 | `DatabaseRegistry` implements `IServiceProvider` | MySQL instances visible to tray | [ADR-0007](adr/0007-service-registry-abstraction.md) |

### Phase 2 Features (Dependency-Ordered)

- [ ] **4.1** `ProjectManager` + `projects:*` IPC — per-project PHP via `.php-version` (**discovery-only:** reads existing files, does not write). Scope: named directory path + scanned PHP version. See [ADR-0006](adr/0006-project-management-scope-boundary.md).
- [ ] **4.2** `DevServerManager` + `devserver:*` IPC — built-in `php -S` server (with logs). Integrates with projects for docroot + PHP version. Registers as `IServiceProvider` for tray visibility. See [ADR-0006](adr/0006-project-management-scope-boundary.md), [ADR-0007](adr/0007-service-registry-abstraction.md).
- [ ] **4.3** `ExtensionManager` + `extensions:*` IPC — **bundled extensions only.** List + toggle enable/disable. No PECL downloads, no compilation. See [ADR-0009](adr/0009-extension-manager-scope-boundary.md).
- [ ] **5.1** Renderer UI — `ProjectsPage`, `ProjectStatusWidget`, `DevServerStatusWidget`, `ExtensionList`
- [ ] **6.1** System tray with quick actions & service status indicators (queries `ServiceRegistry`)
- [ ] **6.2** Auto-start services on Windows boot (reads `auto_start_services` from settings; uses `IPlatformAdapter.createAutoStartEntry`)
- [ ] **7.1** E2E test coverage for PHP + MySQL + dev server workflows

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

> Updated last: 2026-07-16 (Phase 1 complete — Phase 2 scope planned with ADRs 0005–0009, Pre-Phase-2 refactor dependency order established)
