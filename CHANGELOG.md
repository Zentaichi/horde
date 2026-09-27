# Changelog

All notable changes to Horde are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). See [docs/versioning.md](docs/versioning.md) for the release process and the milestone-based tagging convention.

## [Unreleased]

### Added

- Brand token layer — theme-split `--ember` (brand `#F97316` in dark, a darker same-hue ember in light, because brand ember on white is 2.80:1 and fails WCAG 1.4.11), `--ember-dim`, `--ember-glow`, and `--dormant` as an alias of `--muted-foreground` so there is no fourth grey. The dark ramp is retinted to warm graphite (hue 55, chroma 0.006) with lightness held constant
- `ServiceSigil` and `ServiceStatus` primitives — a lifecycle sigil and a state badge, the only two components permitted to render ember. `--primary` and `--ring` stay deliberately neutral so ember remains a parallel signal axis rather than a re-skin
- `success` theme token (theme-split, 5.19:1 light / 8.41:1 dark) for action-confirmation text, retiring the last raw `text-green-500` on a status surface
- Aggregate service status in the app header — a 16px sigil beside the wordmark that reads dormant when nothing Horde manages is serving and risen when a database instance, dev server, or the reverse proxy is. Derived in the renderer from the Pinia stores, so no new IPC channel; the brand wordmark stays a static mark and is not itself the indicator
- `ServiceSigil` gains an `animate` prop to suppress the 150ms transition, used by the header so a cold start cannot fake a state change
- shadcn-vue `switch` primitive, used for the per-project HTTPS toggle
- `DomainEditor` component — domains render as removable mono chips and commit on Enter or blur instead of behind an explicit **Apply**, so a comma-separated run is a single `setDomains` and therefore a single hosts-file write

### Fixed

- The database **instance list is now scoped to the selected engine**. `listInstances()` returns every engine's instances unfiltered, so choosing "PostgreSQL" displayed MySQL instances and contradicted the engine-scoped version list beside it. The `N running / M stopped` tally is per-engine to match, and the empty state names the engine
- Invalid domains are now rejected when saved instead of being stored and silently dropped. `SiteManager.setDomains()` persists any string, passed it to Caddy as a route, and `HostsFile` then filtered it out of the hosts sync — so a domain could be shown as mapped while resolving to nothing. Hostname syntax now lives in one shared helper (`electron/utils/hostname.ts`) used by both, and a rejected save keeps what the user typed instead of clearing the field
- The app can now exit under `HORDE_E2E_TEST`. Three tray-mode behaviours in `electron/main.ts` — a `preventDefault()`-ing close handler, a `window-all-closed` that declined to quit, and an unconditional tray — left the process un-quittable, so Playwright's `electronApp.close()` hung to the 60s test timeout on every spec
- Removing the last mapped domain no longer leaves a stale `# Horde managed` entry in the hosts file. `SiteManager.apply()` skipped `HostsFile.syncDomains()` whenever no domains remained, which is exactly the call that clears Horde's entries, while the Caddy route was still dropped — leaving a domain that resolved to `127.0.0.1` with no proxy behind it. `syncDomains([])` is now always called; it no-ops when there is nothing to clear

### Changed

- E2E specs use role- and slot-scoped locators instead of bare `text=`. The richer UI had turned `text=Projects` and `text=MySQL` into strict-mode violations matching four and five elements respectively. The suite is now 6/6 green in ~5s, from 6/6 failing; it is still not wired into CI
- A three-state service vocabulary (`Absent` → "Not installed", `Dormant` → "Dormant", `Risen` → "Risen · _context_") now drives every service surface. It deliberately does not cover installed artefacts (the CLI shim, a trusted root CA), config toggles (site SSL, extension enablement, autostart), or verbs — those stay plain "Installed"/"Not installed", "Enabled"/"Disabled", and "Start"/"Stop". `docs/branding.md` records the rules and a four-point pre-ship consistency check
- Dashboard and PHP surfaces are driven from the three-state vocabulary; the **Active** and **In Use** badges are retired. Extension toggles gained `aria-label` and `aria-pressed`, which they previously lacked entirely
- The app header now fetches database instances, dev servers, and site status on mount to feed the aggregate sigil. This duplicates fetches the dashboard already performs; the alternative was a header that is only correct on one route
- Sites page: the Reverse Proxy card gains a lifecycle sigil and a `Risen`/`Dormant` badge with its ports in mono, and all three raw green/grey status dots are gone. The mkcert card reports `Root CA trusted` / `Root CA not trusted` in plain words with the binary state as a separate line, and carries no sigil — a trusted root CA is an installed artefact, not a running service, so the three-state vocabulary does not apply to it. The CLI card likewise stays sigil-free
- Sites page: the per-project HTTPS checkbox becomes a plain shadcn switch with a real `<label for>`, and is treated as the config toggle it is — no sigil, no state badge
- Database Manager: each instance row now carries a lifecycle sigil and a `Risen`/`Dormant` badge, with the port and version in mono and the `Port` label dropped. The section header gains a `N running / M stopped` tally counted over the unfiltered instance list, so the count always matches what is on screen
- Database Manager: fixed the action hierarchy in the instance row. `Import` no longer renders identically to `Stop` — it drops to `ghost` so the terminating control is not visually equal to a benign one — and `Delete` becomes a titled icon button, matching the per-database rows below it. **Delete stays a direct control, not an overflow menu**, so the inline Yes/No confirm remains discoverable and no `dropdown-menu` primitive is introduced
- Projects page: the project card now leads with a lifecycle sigil and a chip row (`PHP <version>` in mono, `Risen · :port` when serving, first mapped domain), renders the project path in mono, and reduces **Rescan** and **Open** to titled muted icon buttons. The hand-rolled green/green-dark localhost badge is gone, replaced by the theme-split ember token, so no surface carries a bespoke light/dark colour pair
- Dev servers have no dormant state: `devServerState` is now binary (risen while serving, absent otherwise) because `DevServerManager` deletes the entry on `stop()`, leaving the renderer nothing to report. Previously a stopped dev server was indistinguishable from one never started, and reporting otherwise would have meant the UI claiming state the main process had already discarded
- Docs: reconcile documentation with shipped reality — restructured [docs/roadmap.md](docs/roadmap.md) (Phase 2.5 reordered chronologically, Phase 5 expanded into completeness/DX/community, E2E claims downgraded), refreshed the architecture IPC contract and directory trees, added missing FRs (multi-engine suite, import/export, uninstall, migrations), and fixed stale counts/claims across README, feature-parity, versioning, and the pre-release checklist
- Docs: [docs/branding.md](docs/branding.md) corrected against the shipped app — the three-state table, the covers/does-not-cover split, the sigil lifecycle constraint and the aggregate header exception, a four-point pre-ship consistency check, the theme-split ember values with measured contrast, and a sanctioned 16px inline sigil tier. Fixed three claims that described behaviour the app does not have: the font is Geist (not Inter), the tray icon has never had a dormant/risen treatment, and three of the four tagline placements are unbuilt

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
