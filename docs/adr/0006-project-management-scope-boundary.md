# ADR-0006: Project Management Scope Boundary & Dev Server Integration

**Status:** accepted

**Date:** 2026-07-16

## Context

Phase 2 introduces per-project PHP version via `.php-version` files and a built-in development server. These features naturally connect: `.php-version` files live in project directories, and the dev server serves a project directory using a specific PHP version.

Without an explicit scope boundary, the "project" concept can balloon into full site management — domain mapping, hosts file editing, SSL via mkcert, Caddy/Nginx reverse proxy, and framework scaffolding — all Phase 4 features. We need a Project data model that is useful in Phase 2, intentionally minimal, and designed for extension in Phase 4 without rework.

Additionally, the dev server needs a document root and a PHP version to use. Rather than coupling it directly to the Project store, the two features must remain independent FSD modules to avoid the "feature coupling avalanche."

## Decision

### 1. Project Scope Boundary

A Project in Phase 2 is defined as:

- A **named directory path** the user has explicitly added to Horde
- An **optional PHP version** discovered from a `.php-version` file in that directory (**read-only** — the app never writes `.php-version` files)
- Nothing else

**Explicitly OUT of scope for Phase 2:**

| Deferred to Phase 4 | Rationale |
|---------------------|-----------|
| Domain mapping / hosts file editing | Requires mkcert + Caddy; Phase 4 item |
| SSL via mkcert / Caddy reverse proxy | Entirely Phase 4's "Advanced Herd-like Features" |
| Framework scaffolding (Laravel new, etc.) | Phase 4 item "Project quick-create" |
| CLI `horde` command for `.php-version` resolution | Phase 4 item — the CLI tool is the resolver |
| Writing `.php-version` files from the UI | Discovery-only avoids permission/file-conflict concerns |

### 2. Data Model

```ts
// electron/types/project.ts
interface Project {
  id: string;           // UUID (auto-generated on add)
  name: string;         // display name (defaults to path basename)
  path: string;         // absolute filesystem path
  phpVersion?: string;  // from .php-version file, read at scan time
  // ═══ PHASE 4 EXTENSION POINTS (not implemented) ═══
  // domains?: string[]
  // sslEnabled?: boolean
  // proxyPort?: number
}
```

### 3. IPC Contract: `projects:*` (6 channels)

| Channel | Direction | Signature |
|---------|-----------|-----------|
| `projects:list` | renderer→main | `() → Project[]` |
| `projects:add` | renderer→main | `({ name, path }) → Project` |
| `projects:remove` | renderer→main | `(projectId) → void` |
| `projects:scan-php-version` | renderer→main | `(projectId) → string?` |
| `projects:scan-all` | renderer→main | `() → void` |
| `projects:open-dir` | renderer→main | `(projectId) → void` |

`projects:add` uses Electron's `dialog.showOpenDialog` in the IPC handler to open a native directory picker, then scans the chosen directory for `.php-version`. `projects:remove` does NOT delete files on disk — it only removes the project from Horde's tracking. If a dev server is running for the project, it is stopped first by the handler before removing the row.

### 4. Dev Server Integration

The dev server is a **separate feature module** (`IDevServerManager`) that references projects by `projectId`. The two features are coupled only through the IPC handler layer and the renderer's widget composition — never by direct store imports.

```ts
// electron/services/interfaces/IDevServerManager.ts
interface DevServerStatus {
  projectId: string;
  projectName: string;
  docroot: string;
  phpVersion: string;
  port: number;
  running: boolean;
  pid?: number;
}

interface IDevServerManager {
  start(projectId: string, port?: number): Promise<DevServerStatus>;
  stop(projectId: string): Promise<void>;
  getStatus(projectId: string): Promise<DevServerStatus | null>;
  listAll(): Promise<DevServerStatus[]>;
  getLogs(projectId: string, tail?: number): Promise<string[]>;
}
```

Dev server IPC namespace: `devserver:*` (5 invoke channels + 1 push channel)

| Channel | Type | Signature |
|---------|------|-----------|
| `devserver:start` | invoke | `(projectId, port?) → DevServerStatus` |
| `devserver:stop` | invoke | `(projectId) → void` |
| `devserver:get-status` | invoke | `(projectId) → DevServerStatus?` |
| `devserver:list-all` | invoke | `() → DevServerStatus[]` |
| `devserver:get-logs` | invoke | `(projectId, tail?) → string[]` |
| `devserver:log-{projectId}` | push | Renderer subscribes for real-time log lines |

PHP version resolution at dev server start:
1. Read the project's `.php-version` field from the projects table
2. If present and installed, use that version's PHP binary
3. If absent or not installed, fall back to the globally active PHP version

The dev server uses the PHP version resolved at start time and does not react to `.php-version` changes while running. The user must stop and restart the server for a version change to take effect.

### 5. Cross-Feature Coupling Rules

FSD prohibits features from importing each other's stores. The coupling is handled at the pages/widgets layer:

```
ProjectsPage.vue
  ├── imports ProjectList (from features/projects/)
  └── imports DevServerPanel (from widgets/ — NOT from features/devserver/components/)

ProjectStatusWidget (dashboard)
  └── imports useProjectStore (from features/projects/)

DevServerStatusWidget (dashboard)
  └── imports useDevServerStore (from features/devserver/)
```

The `widgets/` layer composes both. The `pages/` layer composes widgets. No feature module imports another feature module's store or component.

### 6. Persistence

New `projects` table in SettingsStore SQLite:

```sql
CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  path        TEXT NOT NULL UNIQUE,
  php_version TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Dev server configs use a dedicated `dev_servers` table (optional — can be in-memory only for MVP; persistence enables restore on restart):

```sql
CREATE TABLE IF NOT EXISTS dev_servers (
  project_id  TEXT PRIMARY KEY,
  port        INTEGER NOT NULL,
  php_version TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

## Consequences

**Easier:**
- Adding Phase 4 site management means adding fields to `Project` and new IPC channels — no existing Phase 2 code changes
- Projects and dev servers can be developed and tested independently
- The `.php-version` discovery-only approach avoids file-write conflicts and permission issues
- Dev server resolves project PHP version at start time from project data — it never reads `.php-version` files directly, keeping I/O in `ProjectManager`

**Harder:**
- Users cannot create `.php-version` files from the Horde UI — they must create them manually or via CLI
- The "per-project PHP version" feature has no runtime effect at the terminal until Phase 4's `horde` CLI tool ships (it only affects the dev server and UI display)
- The explicit scope boundary requires discipline — feature requests for domain mapping during Phase 2 must be deferred to Phase 4

**Follow-up:**
- Create `electron/types/project.ts` with the `Project` interface
- Create `electron/services/interfaces/IProjectManager.ts`
- Create `electron/services/project-manager.ts` (implements `IProjectManager`)
- Create `electron/ipc/project.handlers.ts`
- Add `projects` and `dev_servers` tables to `SettingsStore.createTables()`
- Create `electron/services/interfaces/IDevServerManager.ts`
- Create `electron/services/dev-server-manager.ts` (implements `IDevServerManager`, registers as `IServiceProvider` per ADR-0007)
- Create `electron/ipc/devserver.handlers.ts`
- Add `projects` and `devserver` bindings to `preload.ts` and `src/types/electron.d.ts`

## Alternatives Considered

- **Write `.php-version` files from the UI (full CRUD).**
  - **Rejected because:** Adds file-write concerns (permissions, whitespace handling, conflict with existing files, trailing newlines) for marginal benefit. The user can `echo "8.2" > .php-version` in one command. Discovery-only defers the write path to Phase 4 if user demand warrants it, without painting us into a corner.
- **Merge projects and dev servers into one feature module.**
  - **Rejected because:** Falls into the same coupling trap this ADR is designed to prevent. A monolithic `project-devserver-manager.ts` would need to change when Phase 4 adds domain management, and it would be harder to test either concern in isolation.
- **Skip the project concept entirely — have the dev server accept raw directory paths.**
  - **Rejected because:** Both `.php-version` and the dev server need a persistent concept of "a directory I care about." Without a project concept, the user would re-enter directory paths every time they use the dev server, and `.php-version` would have no anchor in the UI.
