# Requirements — Horde

## Target Platform

- Windows 10/11 (64-bit)
- Runs without administrator privileges (except optional PATH modifications)

## Future Platform Goal

Cross-platform support (macOS, Linux) is a stated goal but not in scope for the current phase (tracked as Phase 6 in the [roadmap](roadmap.md)). Architectural decisions made during Phase 1 seed the abstraction boundary (see [ADR-0004](adr/0004-platform-abstraction-boundary.md)) so that platform ports are additive, not rewrites.

## Functional Requirements

### FR1 — PHP Version Management

- **FR1.1:** User can download any PHP version from the official Windows PHP mirror.
- **FR1.2:** Downloaded versions are extracted to a user-local directory managed via `IPlatformAdapter` (resolves to `%APPDATA%/Horde/php/<version>` on Windows).
- **FR1.3:** System displays a list of all installed PHP versions.
- **FR1.4:** User can switch the global PHP version by updating the user's `PATH` environment variable.
- **FR1.5:** UI shows the currently active global PHP version.
- **FR1.6:** User can uninstall an installed PHP version.

### FR2 — Database Engine Suite

- **FR2.1:** User can download portable database engine zips (MySQL, MariaDB, PostgreSQL) via `IPlatformAdapter` URL routing.
- **FR2.2:** App initialises an instance data directory (`mysqld --initialize-insecure` for MySQL; engine-equivalent for MariaDB/PostgreSQL).
- **FR2.3:** User can start, stop, and restart database instances.
- **FR2.4:** Instance status (running/stopped) is displayed in real time.
- **FR2.5:** User can create and delete databases via the UI (any engine).
- **FR2.6:** User can import and export SQL dumps per database (engine-specific tools: `mysqldump`/`mysql`, `mariadb-dump`/`mariadb`, `pg_dump`/`psql`).
- **FR2.7:** User can uninstall an installed engine version.
- **FR2.8:** Multiple simultaneous instances run across different engines, versions, and ports (every IPC channel keys on `instanceId`).

### FR3 — Settings & Persistence

- **FR3.1:** User settings (download paths, port numbers, active versions, projects) are stored in a local SQLite database. Theme preference stays in localStorage ([ADR-0008](adr/0008-settings-store-consolidation.md)).
- **FR3.2:** Settings persist across app restarts.
- **FR3.3:** Renderer has access to a generic `settings:get`/`settings:set` IPC channel for key-value preferences.
- **FR3.4:** The SQLite schema evolves via a versioned migration mechanism (`PRAGMA user_version` — [ADR-0010](adr/0010-sqlite-migration-mechanism.md)).

### FR4 — User Interface

- **FR4.1:** A dashboard shows the current status of PHP, databases, projects, and dev servers.
- **FR4.2:** Separate pages for PHP, databases, project management, and sites.
- **FR4.3:** Light/dark theme toggle.

### FR5 — Project Management

- **FR5.1:** User can add project directories via a native folder picker.
- **FR5.2:** The app discovers `.php-version` files in project directories (read-only).
- **FR5.3:** Projects are persisted in SQLite and displayed in a dedicated UI.

### FR6 — Built-in Development Server

- **FR6.1:** User can start a `php -S` development server for any project.
- **FR6.2:** Ports are auto-assigned starting at 8080 with user override.
- **FR6.3:** Real-time server logs are streamed to the UI.

### FR7 — Extension Manager

- **FR7.1:** User can list bundled PHP extensions for any installed version.
- **FR7.2:** User can enable or disable extensions by modifying `php.ini`.
- **FR7.3:** Scope is limited to bundled extensions only (no PECL downloads).

### FR8 — System Tray & Auto-Start

- **FR8.1:** A system tray icon provides quick access to service status and the main window.
- **FR8.2:** User can configure individual services to auto-start when the app launches.
- **FR8.3:** User can configure Horde to auto-start on Windows boot via a Startup folder shortcut.

### FR9 — Sites & Domain Mapping

- **FR9.1:** User can assign one or more local domains (`.test` by convention) to a project.
- **FR9.2:** Horde manages the hosts file entries for those domains (backup + rollback, never overwriting user entries, conflict detection).
- **FR9.3:** Removing a project cleans up its hosts entries and proxy routes.

### FR10 — Built-in HTTPS (mkcert)

- **FR10.1:** Horde manages a local certificate authority and a single wildcard `*.test` certificate.
- **FR10.2:** CA trust installation uses elevation and degrades gracefully when denied.
- **FR10.3:** Adding/removing domains never requires certificate regeneration.

### FR11 — Reverse Proxy (Caddy)

- **FR11.1:** Horde runs Caddy as a managed service (status, start/stop, tray visibility via ServiceRegistry).
- **FR11.2:** Caddy routes each mapped domain to the project's dev server and terminates TLS.
- **FR11.3:** Config changes are validated before reload; occupied/privileged ports fall back gracefully.

### FR12 — Project Quick-Create

- **FR12.1:** User can scaffold a new project from a template (Laravel, Symfony) without leaving the app.
- **FR12.2:** Scaffolding streams progress logs, enforces PHP version requirements, and registers the finished project automatically.
- **FR12.3:** Templates are registered additively via `IScaffolder`.

### FR13 — CLI Companion

- **FR13.1:** A `horde` command is installable on PATH and exposes `version`, `php-version`, `projects`, `sites`, and `servers`.
- **FR13.2:** The CLI resolves `.php-version` for any directory (the resolver deferred from ADR-0006).
- **FR13.3:** Communication with the app is loopback-only and token-authenticated; a clean exit code reports "app not running".

## Non-Functional Requirements

- **Performance:** Downloads must be async with progress indication; UI remains responsive.
- **Reliability:** All critical operations (download, extraction, process start) must handle errors gracefully and log failures.
- **Security:** Renderer process has no direct Node.js access; all system interactions go through typed IPC. The CLI control endpoint binds loopback only and requires a bearer token.
- **Privileges:** The app runs without administrator privileges by default. Privileged operations (hosts edit, CA trust install, low-port binding where required) are user-initiated, elevated per-operation via `IPlatformAdapter`, and degrade gracefully when denied.
- **Testability:** Core services are unit-testable in isolation via mock implementations of shared interfaces (`IPlatformAdapter`, `IRuntimeManager`, `IDatabaseEngine`). E2E tests use mock services behind an env-var gate (suite currently unstable; stabilization tracked in the roadmap).
- **Forward-compatibility:** Service boundaries use shared interfaces (`IDatabaseEngine`, `IPlatformAdapter`, `IServiceProvider`, `IScaffolder`) so that new database engines and Phase 6 platform ports add engines/platforms without refactoring existing code.

## Out of Scope (Phases 5–6)

- Full `php.ini` text editor (extension toggling modifies ini programmatically) — Phase 5
- Real-time query log viewer, automatic binary cleanup, JSON settings export, failure notifications — Phase 5
- Settings page UI and auto-start configuration UI (plumbing exists; UI pending) — Phase 5
- `databases:restart` IPC exposure (engine method exists; channel/UI pending) — Phase 5
- macOS or Linux support (Phase 6)
- Auto-updater, user-configurable binary mirrors, third-party plugin system, i18n, official website (Phase 5)
