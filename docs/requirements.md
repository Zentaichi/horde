# Requirements — Horde

## Target Platform

- Windows 10/11 (64-bit)
- Runs without administrator privileges (except optional PATH modifications)

## Future Platform Goal

Cross-platform support (macOS, Linux) is a stated goal but not in scope for the current phase. Architectural decisions made during Phase 1 seed the abstraction boundary (see [ADR-0004](adr/0004-platform-abstraction-boundary.md)) so that platform ports are additive, not rewrites.

## Functional Requirements

### FR1 — PHP Version Management

- **FR1.1:** User can download any PHP version from the official Windows PHP mirror.
- **FR1.2:** Downloaded versions are extracted to a user-local directory managed via `IPlatformAdapter` (resolves to `%APPDATA%/Horde/php/<version>` on Windows).
- **FR1.3:** System displays a list of all installed PHP versions.
- **FR1.4:** User can switch the global PHP version by updating the user's `PATH` environment variable.
- **FR1.5:** UI shows the currently active global PHP version.

### FR2 — MySQL Portable Server

- **FR2.1:** User can download a portable MySQL zip.
- **FR2.2:** App initialises a data directory (`mysqld --initialize`).
- **FR2.3:** User can start, stop, and restart the MySQL process.
- **FR2.4:** Service status (running/stopped) is displayed in real time.
- **FR2.5:** User can create and delete databases via the UI.

### FR3 — Settings & Persistence

- **FR3.1:** All user settings (download paths, port numbers, active versions, projects) are stored in a local SQLite database.
- **FR3.2:** Settings persist across app restarts.
- **FR3.3:** Renderer has access to a generic `settings:get`/`settings:set` IPC channel for key-value preferences.

### FR4 — User Interface

- **FR4.1:** A dashboard shows the current status of PHP, databases, projects, and dev servers.
- **FR4.2:** Separate pages for PHP, databases, and project management.
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

## Non-Functional Requirements

- **Performance:** Downloads must be async with progress indication; UI remains responsive.
- **Reliability:** All critical operations (download, extraction, process start) must handle errors gracefully and log failures.
- **Security:** Renderer process has no direct Node.js access; all system interactions go through typed IPC.
- **Testability:** Core services are unit-testable in isolation via mock implementations of shared interfaces (`IPlatformAdapter`, `IRuntimeManager`, `IDatabaseEngine`). E2E tests use mock services behind an env-var gate.
- **Forward-compatibility:** Service boundaries use shared interfaces (`IDatabaseEngine`, `IPlatformAdapter`) so that Phase 3 database engines and Phase 6 platform ports add engines/platforms without refactoring Phase 1/2 code.

## Out of Scope (Current Phase)

- PostgreSQL, MariaDB, or other database engines
- Built-in HTTPS via mkcert, Caddy/Nginx reverse proxy
- Full `php.ini` text editor (extension toggling modifies ini programmatically)
- Site/domain mapping and hosts file integration
- CLI companion tool
- macOS or Linux support
