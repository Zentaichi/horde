# Changelog

All notable changes to Horde are documented in this file.

## [Unreleased]

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

### Changed

- `DatabaseRegistry.listEngines()` returns `{ engine, displayName }[]` instead of `string[]`
- All UI components made engine-agnostic (removed hardcoded "MySQL" labels)
- `DatabasePage.vue` dynamically populates engine list with dropdown selection
- `DatabaseStatusWidget.vue` uses `displayName || engine` for cross-engine display

### Fixed

- Frontend `defineProps` changed to `const props = defineProps` in `InstanceList.vue` for script-level engine access
- Mock `MySqlManager` and unit tests updated for new interface methods and types
