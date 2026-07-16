# ADR-0008: SettingsStore Consolidation as Canonical Persistence Layer

**Status:** accepted

**Date:** 2026-07-16

## Context

`SettingsStore` (SQLite via `better-sqlite3`) was built in Phase 1 with two tables:

- `settings` — generic key-value store. **Zero consumers.** No IPC channels expose it.
- `instances` — database instance configs for restore-on-restart. **Used by DatabaseRegistry.**

Meanwhile, other state lives outside SettingsStore:

| State | Current storage | Problem |
|-------|----------------|---------|
| Theme (dark/light) | `localStorage` (renderer) | Inaccessible from main process; no way to sync across windows |
| Active PHP version | Scanned from real PATH on every call | No cache; every dashboard load hits the registry |
| User preferences | None | Phase 2 features (auto-start config, window position) need somewhere to live |

Phase 2 adds projects, dev server configs, auto-start preferences, and potentially window state persistence. Without a unified persistence strategy, each feature will invent its own storage (flat files, more localStorage keys, dedicated SQLite tables written by one-off code).

## Decision

SettingsStore is the **single canonical persistence layer** for the main process. One IPC channel pair (`settings:get`, `settings:set`) exposes the KV store to the renderer for simple preferences. Structured data (projects, instances) gets dedicated tables with typed CRUD methods on SettingsStore — same pattern as the existing `instances` table.

### 1. Theme stays in localStorage

Theme is a renderer-only concern. `useTheme` composable reads/writes `localStorage` and toggles a `dark` class on `document.documentElement`. Adding an IPC round-trip for a CSS class toggle is over-engineering. No change needed.

### 2. `settings:*` IPC channels (2 channels)

```
settings:get  (key: string) → string | null
settings:set  (key: string, value: string) → void
```

These expose the existing `settings` KV table. Simple preferences (auto-start config, window bounds, last-used tab) go through these two channels. Each value is a string — callers JSON-serialize structured data.

Preload + renderer type additions:

```ts
settings: {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}
```

### 3. Active PHP version cache

`PhpManager.switchGlobal()` calls `settingsStore.set('active_php_version', version)` after a successful switch. On startup, `PhpManager` reads the cached value for fast initial display. `getActiveVersion()` verifies the cache against the real PATH; if they mismatch, the cache is updated silently. This eliminates the registry-query-on-every-dashboard-load pattern.

### 4. Projects table

As designed in ADR-0006, SettingsStore gains:

```sql
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  path        TEXT NOT NULL UNIQUE,
  php_version TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

With typed methods:

```ts
saveProject(project: Project): void
deleteProject(id: string): void
loadProjects(): Project[]
```

Same pattern as existing `saveInstance`/`deleteInstance`/`loadInstances`.

### 5. Auto-start configuration

Stored as a JSON array in the `settings` table:

```
Key:   auto_start_services
Value: ["mysql:abc-123-instance-id", "devserver:xyz-789-project-id"]
```

The auto-start feature reads this key on boot, resolves each service ID via `ServiceRegistry`, and starts it. The UI toggles individual entries by reading, modifying, and writing the JSON array. No dedicated table needed — this is configuration, not structured data with relationships.

### 6. Dev server configs

Either in-memory only (ephemeral, recreated each session) or persisted in a `dev_servers` table per ADR-0006. The decision depends on whether "restore dev server configs on restart" is valuable. For Phase 2, in-memory with an optional persist toggle is the recommended starting point.

## Consequences

**Easier:**
- Any new IPC handler that needs persistence calls `settingsStore.get('key')` — no new tables, no new channels
- Structured data follows the `instances`/`projects` pattern: one table + three methods on SettingsStore
- The `settings:*` IPC channels give the renderer a direct line to persistent storage without per-feature channels

**Harder:**
- The `settings` KV table stores strings only — callers must serialize/deserialize structured data (JSON). This is simple but means no querying or indexing individual fields within a JSON value.
- SettingsStore is growing beyond "settings" into "all persistence." Renaming it to `PersistenceStore` would be more accurate but is a cosmetic change not worth the diff at this stage.
- No migration system exists for SQLite schema. Adding tables requires manual `CREATE TABLE IF NOT EXISTS` in `createTables()`. A Phase 5 concern.

**Follow-up:**
- Add `settings:get` and `settings:set` IPC handlers
- Add `projects` table to `SettingsStore.createTables()`
- Add `saveProject`, `deleteProject`, `loadProjects` methods
- Update `PhpManager.switchGlobal()` to write active version cache
- Add `settings` bindings to `preload.ts` and `src/types/electron.d.ts`
- Delete the `ProgressInfo` type alias in `electron/utils/download.ts` (unrelated cleanup)

## Alternatives Considered

- **electron-store (JSON file on disk).**
  - **Rejected because:** We already have `better-sqlite3` compiled, wired, and tested. Adding a second persistence mechanism duplicates infrastructure. SQLite gives us typed tables with constraints (`UNIQUE`, `FOREIGN KEY`) that a JSON file doesn't.
- **Dedicated IPC channel per preference (e.g., `theme:get`, `auto-start:get`).**
  - **Rejected because:** Each new preference requires a new IPC channel, preload binding, and renderer type declaration. The `settings:get/set` pair is one channel pair that covers all simple key-value preferences — new preferences add zero IPC surface area.
- **Move theme to SettingsStore.**
  - **Rejected because:** Theme toggle is instant (CSS class on `<html>`). Adding an async IPC round-trip to every toggle introduces visible latency for a cosmetic feature. If cross-window theme sync becomes necessary later, a `settings:set('theme', 'dark')` broadcast can be added without removing the localStorage fast path.
