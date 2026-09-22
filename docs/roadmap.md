# Roadmap (Subject to Change)

## Phase 1 — Core MVP

**Goal:** Demonstrable PHP + MySQL on Windows with architecture that survives Phase 3 without rework.

- [x] Project scaffolding (Electron + Vue 3 + Tailwind + Feature Sliced Design)
- [x] shadcn-vue component library installed (Button, Card, Progress, Badge) + theme CSS infrastructure
- [x] `IPlatformAdapter` interface + `Win32PlatformAdapter` implementation (PATH, ZIP, URLs, binary resolution)
- [x] PHP download URL routing via `IPlatformAdapter` (releases URL, download URL construction, extraction, PATH I/O all routed through adapter)
- [x] PHP version list & download from windows.php.net (with progress bar: speed, ETA, byte counter)
- [x] tsyringe DI container wired (services resolved from container; IPC handlers resolve via token)
- [x] Global PHP version switching via PATH (user PATH via setx; reads current PATH from registry, removes old Horde entries, adds new version)
- [x] `IDatabaseEngine` interface + `DatabaseRegistry` (multi-engine instance tracking)
- [x] MySQL portable download & initialise (`MySqlManager` implements `IDatabaseEngine`: download via adapter, `mysqld --initialize-insecure`, spawn/kill process, port check)
- [x] MySQL start/stop process control (spawn with SIGTERM grace + SIGKILL fallback, status polling)
- [x] Engine-agnostic IPC contract: `databases.*` (list-engines, download, initialize, start/stop/get-status, list-instances, remove-instance, create/drop/list-databases, onDownloadProgress)
- [x] Dashboard UI with real-time status (PhpStatusWidget + DatabaseStatusWidget: green/gray dots, running instance counts, direct nav links)
- [x] Settings persistence with SQLite
- [x] Light/dark theme toggle (useTheme composable + ThemeToggle button in nav bar)
- [x] Unit tests
- [ ] Stabilize the E2E suite (Playwright infra exists, but the suite is unstable — mock-wiring incomplete, not wired into CI; see [pre-release-checklist](pre-release-checklist.md))
- [x] GitHub Actions CI building Windows installer

> **Cross-platform seed (do now, cheap):** `IPlatformAdapter` interface with Windows implementation only. All OS-specific paths, URLs, and extraction go through the adapter. macOS/Linux adapters are single-class files written in Phase 6 — no Phase 1 code needs to change when they arrive.

## Phase 2 — Polish & Developer UX

### Pre-Phase-2 Refactors (Implementation Order — Run First)

These refactors address architectural risks identified during Phase 1 review. Each enables one or more Phase 2 features and prevents code duplication, scope creep, and cross-feature coupling.

| Step | Priority | Refactor                                                                      | Enables                                       | Status | ADR                                                                                                             |
| ---- | -------- | ----------------------------------------------------------------------------- | --------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| 0.1  | P0       | Consolidate `downloadFile()` into one shared utility                          | All download features                         | [x]    | [ADR-0005](adr/0005-download-utility-consolidation.md)                                                          |
| 0.2  | P2       | Fix `filterHordeEntries` to use `this.basePath` instead of hardcoded strings  | Correctness for all PATH operations           | [x]    | —                                                                                                               |
| 0.3  | P2       | Delete stale artifacts (`src/shared/types/php.js`, `.js.map`)                 | Cleanliness                                   | [x]    | —                                                                                                               |
| 0.4  | P2       | Install `eslint-plugin-boundaries` + FSD import rules                         | Prevents cross-feature imports in new modules | [x]    | [ADR-0001](adr/0001-feature-sliced-design.md) (follow-up)                                                       |
| 1.1  | P1       | Add `resolveExtensionFileName()` to `IPlatformAdapter`                        | Extension manager                             | [x]    | [ADR-0009](adr/0009-extension-manager-scope-boundary.md)                                                        |
| 1.2  | P1       | Add `createAutoStartEntry()` / `removeAutoStartEntry()` to `IPlatformAdapter` | Auto-start on boot                            | [x]    | —                                                                                                               |
| 2.1  | P1       | Add `settings:*` IPC channels (`get`/`set`)                                   | All persistent preferences                    | [x]    | [ADR-0008](adr/0008-settings-store-consolidation.md)                                                            |
| 2.2  | P1       | Add `projects` table to `SettingsStore`                                       | Project persistence                           | [x]    | [ADR-0006](adr/0006-project-management-scope-boundary.md), [ADR-0008](adr/0008-settings-store-consolidation.md) |
| 2.3  | P1       | Cache active PHP version in `settings` KV                                     | Dashboard perf; dev server PHP resolution     | [x]    | [ADR-0008](adr/0008-settings-store-consolidation.md)                                                            |
| 3.1  | P0       | `IServiceProvider` interface + `ServiceRegistry` aggregator                   | Tray + auto-start unified service view        | [x]    | [ADR-0007](adr/0007-service-registry-abstraction.md)                                                            |
| 3.2  | P0       | `DatabaseRegistry` implements `IServiceProvider`                              | MySQL instances visible to tray               | [x]    | [ADR-0007](adr/0007-service-registry-abstraction.md)                                                            |

### Phase 2 Features (Dependency-Ordered)

- [x] **4.1** `ProjectManager` + `projects:*` IPC — per-project PHP via `.php-version` (**discovery-only:** reads existing files, does not write). Scope: named directory path + scanned PHP version. See [ADR-0006](adr/0006-project-management-scope-boundary.md).
- [x] **4.2** `DevServerManager` + `devserver:*` IPC — built-in `php -S` server (with logs). Integrates with projects for docroot + PHP version. Registers as `IServiceProvider` for tray visibility. See [ADR-0006](adr/0006-project-management-scope-boundary.md), [ADR-0007](adr/0007-service-registry-abstraction.md).
- [x] **4.3** `ExtensionManager` + `extensions:*` IPC — **bundled extensions only.** List + toggle enable/disable. No PECL downloads, no compilation. See [ADR-0009](adr/0009-extension-manager-scope-boundary.md).
- [x] **5.1** Renderer UI — `ProjectsPage`, `ProjectStatusWidget`, `DevServerStatusWidget`, `ExtensionList`
- [x] **6.1** System tray with quick actions & service status indicators (queries `ServiceRegistry`)
- [x] **6.2a** Auto-start plumbing — `autostart:*` IPC, `IPlatformAdapter` boot entry, startup runner reading `auto_start_services` (no UI yet; see Phase 5)
- [ ] **6.2b** Settings UI to configure auto-start services and the boot entry (the `autostart:*` and `settings:*` channels exist but nothing in the renderer calls them)

## Phase 2.5 — Branding & Identity

**Goal:** Establish a cohesive visual identity around the "resurrecting and animating dev services" theme. The skull logo — a stylized skull with an engraved "H" — embodies the app's ability to start, stop, resurrect, and animate development services and database instances.

- [x] Skull logo component (`HordeLogo.vue`) — resizable inline SVG, respects `currentColor` for theme compatibility
- [x] Logo integrated in app header alongside "Horde" title
- [x] System tray uses actual logo (`horde_icon.ico`) via `nativeImage.createFromPath()`
- [x] `electron-builder.yml` references correct icon filename (`horde_icon.ico`)
- [x] Window title set explicitly in `BrowserWindow` options
- [x] Favicon linked in `index.html`
- [x] Tagline on dashboard: "Resurrect and animate your dev services"
- [x] Brand guidelines documented (`docs/branding.md`): logo, palette, typography, tagline, icon specs

> **Design philosophy:** The skull motif represents mastery over the lifecycle of development services — resurrection (starting up), animation (keeping alive), and quietus (graceful shutdown). Every Horde feature from PHP version switching to MySQL instance management is an expression of this control.

## Phase 3 — Full Database Suite

- [x] PostgreSQL engine (implements `IDatabaseEngine` — additive, zero refactors of Phase 1/2 code)
- [x] MariaDB engine (same)
- [x] Database import/export (SQL dump)
- [x] Multiple simultaneous database instances (IPC already supports `instanceId` from Phase 1)
- [x] Cross-engine status dashboard

> **Reality check:** If `IDatabaseEngine` is implemented in Phase 1, Phase 3 reduces to writing two new `implements IDatabaseEngine` classes plus UI. If skipped, Phase 3 includes a costly refactor of the MySQL IPC layer and renderer bindings.

## Phase 4 — Advanced Herd-like Features

- [x] Local domain mapping and hosts file integration (`SiteManager` + `HostsFile`, `.test` convention, backup/rollback + conflict detection — [ADR-0012](adr/0012-site-domain-management-single-source-of-truth.md))
- [x] Reverse proxy with Caddy for automatic SSL (`CaddyManager` as `IServiceProvider`, validate-then-reload, port fallback — [ADR-0013](adr/0013-caddy-reverse-proxy-as-managed-service.md))
- [x] Built-in HTTPS via mkcert (wildcard `*.test` cert, elevated CA trust — [ADR-0012](adr/0012-site-domain-management-single-source-of-truth.md))
- [x] Project quick-create from Laravel, Symfony, etc. (`IScaffolder` registry + composer — [ADR-0014](adr/0014-scaffolder-registry.md))
- [x] CLI companion tool (`horde` command — hidden Electron mode, transport-agnostic command layer — [ADR-0015](adr/0015-cli-companion-architecture.md))
- [x] SQLite schema migration mechanism (`PRAGMA user_version` — [ADR-0010](adr/0010-sqlite-migration-mechanism.md))
- [x] Privileged-operation elevation abstraction (per-operation elevation, graceful degradation — [ADR-0011](adr/0011-privileged-operation-elevation.md))

## Phase 5 — Completeness, Polish & Community

Closes gaps in already-shipped features, absorbs the planned (☑️) items from [feature-parity](feature-parity.md), and delivers the original Phase 5 community goals.

### 5a — Completeness (gaps relative to shipped features)

- [ ] Settings page UI — first consumer of the existing `settings:*` IPC channels
- [ ] Auto-start configuration UI (finish 6.2b — toggles for services + boot entry via existing `autostart:*` channels)
- [ ] Expose `databases:restart` IPC channel + Restart button (engine-level `restart()` already exists on all three engines; only start/stop are reachable today)
- [ ] Remove or expose dead IPC channels (`proxy:set-routes`, `autostart:start-service` are registered but absent from `preload.ts`)
- [ ] Stabilize the E2E suite and wire it into CI (carried from Phase 1)
- [ ] Write `.php-version` files from the UI (deferred write path — [ADR-0006](adr/0006-project-management-scope-boundary.md))
- [ ] Decide + implement `dev_servers` persistence for restore-on-restart ([ADR-0006](adr/0006-project-management-scope-boundary.md), [ADR-0008](adr/0008-settings-store-consolidation.md))
- [ ] Caddy version upgrade/maintenance path (explicit follow-up — [ADR-0013](adr/0013-caddy-reverse-proxy-as-managed-service.md))

### 5b — Planned DX features (feature-parity ☑️)

- [ ] Full `php.ini` text editor (extension toggling already modifies ini programmatically)
- [ ] Real-time database query log viewer
- [ ] Automatic cleanup of unused binary versions
- [ ] JSON configuration file for settings export/sync
- [ ] Notifications on service failures

### 5c — Community

- [ ] Auto-updater for the app itself
- [ ] User-configurable binary mirrors
- [ ] Plugin system for third-party services
- [ ] Internationalisation (i18n)
- [ ] Official website and documentation

## Phase 6 — Cross-Platform Support

**Goal:** macOS and Linux support, seeded by the `IPlatformAdapter` abstraction built in Phase 1.

- [ ] `DarwinPlatformAdapter` — macOS paths, PATH (shell profiles), ZIP extraction, PHP download URLs, auto-start (launchd plists), hosts path
- [ ] `LinuxPlatformAdapter` — Linux equivalents
- [ ] Implement the full Phase 4 adapter surface on both platforms (hosts I/O, elevation via sudo/polkit, CA trust, proxy/cert dirs, Caddy/mkcert/composer download URLs, CLI shims — [ADR-0004](adr/0004-platform-abstraction-boundary.md), [ADR-0011](adr/0011-privileged-operation-elevation.md), [ADR-0013](adr/0013-caddy-reverse-proxy-as-managed-service.md))
- [ ] Platform-specific orphan-process reattach detection (`netstat`/`tasklist` equivalents — deferred from [ADR-0007](adr/0007-service-registry-abstraction.md))
- [ ] DMG + AppImage packaging (`electron-builder` config)
- [ ] Platform-specific E2E tests (Playwright on macOS/Linux CI)
- [ ] Cross-platform installer documentation

> **Deferred by design.** Phase 1 built the abstraction boundary; this phase writes the implementations. No Phase 1–5 code needs rewriting — the adapter is swapped at startup via DI container configuration.

> Updated last: 2026-09-22 (documentation reconciliation — Phase 2.5 reordered, Phase 5 expanded into completeness/DX/community, E2E claims downgraded to match reality)
