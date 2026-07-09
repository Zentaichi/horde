# ADR-0003: Multi-Engine Database Abstraction (IDatabaseEngine)

**Status:** accepted

**Date:** 2026-07-09

## Context

Phase 1 ships with MySQL only. Phase 3 adds PostgreSQL and MariaDB. If the Phase 1 IPC contract and service layer are MySQL-specific (`mysql.start()`, `mysql.getStatus()`, etc.), then Phase 3 requires:

1. Adding parallel `postgres.*` and `mariadb.*` IPC channels.
2. Rewriting any renderer code that assumes a single database engine.
3. Rewriting any main-process orchestration code that hardcodes MySQL.

We need a design where adding an engine is purely additive — register a new class, add UI components, no existing code changes.

## Decision

**All database engines implement `IDatabaseEngine`**, and the IPC contract uses an **engine-agnostic `databases.*` namespace** rather than engine-specific namespaces.

**Interface (`electron/services/interfaces/IDatabaseEngine.ts`):**

```ts
export interface IDatabaseEngine {
  readonly engine: string;
  readonly displayName: string;

  // Version lifecycle
  listAvailable(): Promise<string[]>;
  listInstalled(): Promise<string[]>;
  download(version: string, onProgress?: ProgressCallback): Promise<void>;
  uninstall(version: string): Promise<void>;

  // Instance lifecycle (instanceId enables multiple simultaneous instances)
  initialize(config: DatabaseInstanceConfig): Promise<void>;
  start(instanceId: string): Promise<void>;
  stop(instanceId: string): Promise<void>;
  restart(instanceId: string): Promise<void>;
  getStatus(instanceId: string): Promise<DatabaseInstanceStatus>;
  listInstances(): Promise<DatabaseInstanceStatus[]>;
  removeInstance(instanceId: string): Promise<void>;

  // Data operations
  createDatabase(instanceId: string, name: string): Promise<void>;
  dropDatabase(instanceId: string, name: string): Promise<void>;
  listDatabases(instanceId: string): Promise<string[]>;
}
```

**IPC contract (`electron/types/ipc.d.ts`):**

```ts
databases: {
  listEngines(): Promise<string[]>;
  download(engine: string, version: string, onProgress: (pct: number) => void): Promise<void>;
  start(instanceId: string): Promise<void>;
  stop(instanceId: string): Promise<void>;
  getStatus(instanceId: string): Promise<DatabaseInstanceStatus>;
  // ... etc
}
```

**DI registration uses namespaced tokens:**

```ts
container.register<IDatabaseEngine>('IDatabaseEngine:mysql', { useClass: MySqlManager });
container.register<IDatabaseEngine>('IDatabaseEngine:postgresql', { useClass: PostgreSqlManager });
```

The IPC handler resolves the correct engine by token:

```ts
ipcMain.handle('databases:start', async (_event, instanceId: string) => {
  const engine = resolveEngineByInstanceId(instanceId);
  await engine.start(instanceId);
});
```

**Renderer never imports engine-specific types.** The `databases.listEngines()` channel returns `['mysql', 'postgresql', 'mariadb']`, and the UI dynamically builds pages based on that list.

## Consequences

**Easier:**
- Adding PostgreSQL in Phase 3 is ~100 lines of new class + 1 line of container registration + UI components. No changes to existing IPC channels, preload, or renderer stores.
- Multiple simultaneous instances are supported from day one because every channel uses `instanceId`.
- The DI container's engine registry supports runtime engine discovery.

**Harder:**
- Every database IPC handler must resolve the correct engine from the container, adding a lookup step.
- The `DatabaseInstanceConfig` and `DatabaseInstanceStatus` types must carry an `engine` discriminator, which is slightly more verbose than engine-specific types.
- Engine-specific features (e.g., MySQL's `CREATE USER` vs PostgreSQL's `CREATE ROLE`) must be exposed via engine-specific extension interfaces or omitted from the common contract.

**Follow-up:**
- Implement `IDatabaseEngine` interface file before writing `MySqlManager`.
- Build `MySqlManager` against `IDatabaseEngine` from the start.
- Write the engine registry helper that maps `instanceId` → engine token.

## Alternatives Considered

- **Engine-specific IPC namespaces** (`mysql.*`, `postgres.*`, `mariadb.*`).
  - **Rejected because:** The renderer must import per-engine APIs. Adding an engine means adding preload bindings, IPC channels, and renderer call sites. Orchestration code that lists all databases must special-case each engine.
- **Single `database.*` namespace with an `engine` string parameter, but no `IDatabaseEngine` interface.**
  - **Rejected because:** The IPC handler becomes a switch statement over engine names, which grows unboundedly. No compiler enforcement that new engines implement the full contract.
- **Union type** (`type DatabaseEngine = MySqlManager | PostgreSqlManager`).
  - **Rejected because:** A union doesn't enforce that new engines implement all methods. The interface provides compiler-enforced contracts.
