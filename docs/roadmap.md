# Roadmap (Subject to Change)

## Phase 1 – Core MVP (Current)
**Goal:** Demonstrable PHP + MySQL management with clean architecture.
- [ ] Project scaffolding (Electron + Vue 3 + Tailwind + Feature Sliced Design)
- [ ] PHP version list & download from windows.php.net
- [ ] Global PHP version switching via PATH
- [ ] MySQL portable download & initialise
- [ ] MySQL start/stop process control
- [ ] Dashboard UI with real‑time status
- [ ] Settings persistence with SQLite
- [ ] Unit and basic E2E tests
- [ ] GitHub Actions CI building Windows installer

## Phase 2 – Polish & Extra PHP Features
- [ ] Per‑project PHP version with `.php-version`
- [ ] Extension manager UI
- [ ] `php.ini` editor
- [ ] Built‑in development server (with logs)
- [ ] Light/Dark theme system
- [ ] System tray with quick actions

## Phase 3 – Full Database Suite
- [ ] PostgreSQL engine (implement `IDatabaseEngine` interface)
- [ ] MariaDB engine
- [ ] Database import/export (SQL dump)
- [ ] Multiple simultaneous database instances

## Phase 4 – Advanced Herd‑like Features
- [ ] Local domain mapping and hosts file integration
- [ ] Reverse proxy with Caddy (or Nginx) for automatic SSL
- [ ] Project quick‑create from Laravel, Symfony, etc.
- [ ] Auto‑start services on Windows boot
- [ ] CLI companion tool (`horde` command)

## Phase 5 – Maintenance & Community
- [ ] Auto‑updater for the app itself
- [ ] User‑configurable binary mirrors
- [ ] Plugin system for third‑party services
- [ ] Internationalisation (i18n)
- [ ] Official website and documentation

> Updated last: 07/05/2026