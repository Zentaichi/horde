# Feature Parity Reference (Herd / DBngin)

This document lists the full feature set of Laravel Herd and DBngin, used as inspiration for Horde.

| Icon | Meaning            |
| ---- | ------------------ |
| ✔️   | Done               |
| 🔄   | In progress        |
| ☑️   | Planned (post-MVP) |

> **Note:** Phase 4 is complete (local sites, HTTPS via mkcert + Caddy, quick-create, CLI companion). See the [roadmap](roadmap.md) for Phase 5+ plans.

## PHP Management

| Feature                                            | Status |
| -------------------------------------------------- | ------ |
| Download any PHP version                           | ✔️     |
| List installed versions                            | ✔️     |
| Switch global PHP version                          | ✔️     |
| Per-project version via `.php-version`             | ✔️     |
| Enable/disable extensions with UI                  | ✔️     |
| Edit `php.ini` directly in the app                 | ☑️     |
| Run a local development server with a single click | ✔️     |
| Built-in HTTPS via mkcert                          | ✔️     |
| Auto-start a chosen PHP version at system boot     | ✔️     |

## Database Management

| Feature                                                    | Status |
| ---------------------------------------------------------- | ------ |
| Download & install portable MySQL                          | ✔️     |
| Start / Stop / Restart database service                    | ✔️     |
| Create / Delete databases                                  | ✔️     |
| Support for MariaDB, PostgreSQL                            | ✔️     |
| Import / Export SQL dumps                                  | ✔️     |
| Multiple simultaneous instances (different versions/ports) | ✔️     |
| Real-time query log viewer                                 | ☑️     |

## Site & Domain Management

| Feature                                                      | Status |
| ------------------------------------------------------------ | ------ |
| Map local domains to project folders (hosts file management) | ✔️     |
| Automatic Caddy reverse proxy                                | ✔️     |
| Built-in HTTPS via wildcard mkcert certificate               | ✔️     |
| Quick project creation from framework templates              | ✔️     |

## CLI Companion

| Feature                                         | Status |
| ----------------------------------------------- | ------ |
| `horde` command on PATH (install/uninstall)     | ✔️     |
| `horde php-version` `.php-version` resolver     | ✔️     |
| Status queries (`projects`, `sites`, `servers`) | ✔️     |

## Developer Experience

| Feature                                         | Status |
| ----------------------------------------------- | ------ |
| System tray icon with service status indicators | ✔️     |
| Automatic cleanup of unused binary versions     | ☑️     |
| JSON configuration file for settings sync       | ☑️     |
| Notifications on service failures               | ☑️     |
