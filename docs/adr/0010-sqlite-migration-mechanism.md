# ADR-0010: SQLite Schema Migration Mechanism

**Status:** accepted

**Date:** 2026-08-17

## Context

`SettingsStore` (ADR-0008) uses `CREATE TABLE IF NOT EXISTS` in `createTables()` as its only schema management. That is fine for brand-new tables but cannot evolve existing ones. Phase 4 extends the `projects` table with `domains`, `ssl_enabled`, and `proxy_port` (the extension points reserved in [ADR-0006](0006-project-management-scope-boundary.md)). ADR-0008 deferred migrations to Phase 5, but Phase 4 forces a schema change on a table that already holds user data — doing nothing means existing databases silently lose the new columns.

## Decision

Introduce a minimal, ordered migration runner in `SettingsStore` backed by SQLite's `PRAGMA user_version`:

- `createTables()` keeps creating the **pre-migration base schema** so fresh and existing databases converge through the same migration path.
- A module-level `MIGRATIONS` array of `{ version, name, up }` runs inside a transaction, advancing `user_version` after each successful migration. Migrations already applied (where `version <= user_version`) are skipped.
- Phase 4 ships **migration 1**: `ALTER TABLE projects ADD COLUMN domains TEXT`, `ADD COLUMN ssl_enabled INTEGER NOT NULL DEFAULT 0`, `ADD COLUMN proxy_port INTEGER`. `saveProject`/`loadProjects` serialize/parse `domains` as JSON and coerce booleans/ints.

`user_version` is chosen over a `schema_migrations` table because it is a single integer the SQLite engine maintains natively, keeping the runner ~25 lines and unambiguous to test.

## Consequences

**Easier:**

- Existing users upgrade without data loss or manual SQL.
- Adding Phase 5+ fields is one array entry plus a column read — no bespoke ALTER logic scattered around.
- The `PRAGMA user_version` mechanism is testable with a mocked `better-sqlite3` (the test harness asserts migrations run at version 0 and are skipped at version 1).

**Harder:**

- Migrations are append-only; destructive or reversible changes require new forward migrations (SQLite `ALTER TABLE DROP COLUMN` is limited to newer versions).
- `CREATE TABLE IF NOT EXISTS` base schema + migrations can drift if a column is added to the base schema _and_ to a migration. Discipline: base schema is frozen; all new columns arrive via migrations.

**Follow-up:**

- Add migration 1 and the runner (done with Phase 4 Slice 1).
- Update [ADR-0008](0008-settings-store-consolidation.md) to supersede its "Phase 5 concern" note (done).

## Alternatives Considered

- **Manual `ALTER TABLE IF NOT EXISTS`-style guards.**
  - **Rejected because:** SQLite has no `ADD COLUMN IF NOT EXISTS`; any per-column guard duplicates bookkeeping across call sites and cannot express multi-column or data-migration steps.
- **`schema_migrations` table.**
  - **Rejected because:** Equivalent capability with more surface area (table creation, row inserts, ordering queries). `user_version` is the documented SQLite mechanism for exactly this.
