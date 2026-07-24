# Feature Parity Reference (Herd / DBngin)

This document lists the full feature set of Laravel Herd and DBngin, used as inspiration for Horde.

| Icon | Meaning |
|------|---------|
| ✔️ | Done |
| 🔄 | In progress |
| ☑️ | Planned (post-MVP) |

> **Note:** Phase 2 is complete. See the [roadmap](roadmap.md) for Phase 3+ plans.

## PHP Management

| Feature | Status |
|---------|--------|
| Download any PHP version | ✔️ |
| List installed versions | ✔️ |
| Switch global PHP version | ✔️ |
| Per-project version via `.php-version` | ✔️ |
| Enable/disable extensions with UI | ✔️ |
| Edit `php.ini` directly in the app | ☑️ |
| Run a local development server with a single click | ✔️ |
| Built-in HTTPS via mkcert | ☑️ |
| Auto-start a chosen PHP version at system boot | ✔️ |

## Database Management

| Feature | Status |
|---------|--------|
| Download & install portable MySQL | ✔️ |
| Start / Stop / Restart database service | ✔️ |
| Create / Delete databases | ✔️ |
| Support for MariaDB, PostgreSQL | ☑️ |
| Import / Export SQL dumps | ☑️ |
| Multiple simultaneous instances (different versions/ports) | ✔️ |
| Real-time query log viewer | ☑️ |

## Site & Domain Management

| Feature | Status |
|---------|--------|
| Map local domains to project folders (hosts file management) | ☑️ |
| Automatic PHP built-in server or Caddy proxy | ☑️ |
| Quick project creation from framework templates | ☑️ |

## Developer Experience

| Feature | Status |
|---------|--------|
| System tray icon with service status indicators | ✔️ |
| Automatic cleanup of unused binary versions | ☑️ |
| JSON configuration file for settings sync | ☑️ |
| Notifications on service failures | ☑️ |
