# ADR-0007: Service Registry Abstraction for Unified Process Status

**Status:** accepted

**Date:** 2026-07-16

## Context

Phase 2 introduces a built-in development server alongside the existing MySQL instance management, plus a system tray with service status indicators and auto-start on boot. Each service type (MySQL, dev server) manages its own process lifecycle internally — MySQL in `MySqlManager.instances` (an in-memory `Map`), dev servers in `DevServerManager` (similar). The system tray and auto-start feature need a **unified view** of all running services without importing individual service managers directly.

Additionally, if the app crashes, running `mysqld.exe` and `php.exe` processes become orphaned zombies. On restart, the app can see persisted instance configs but cannot determine which processes are still alive — they show as "stopped" in the UI despite running on the ports.

We need:
1. A single abstraction that aggregates status across all service types
2. A startup mechanism to detect and reattach to orphaned processes

## Decision

Create an `IServiceProvider` interface and a `ServiceRegistry` aggregator that all long-running service managers register with.

### IServiceProvider

```ts
// electron/services/interfaces/IServiceRegistry.ts
interface ServiceStatus {
  serviceId: string;       // instanceId (MySQL) or projectId (dev server)
  providerId: string;      // 'mysql' | 'devserver'
  engine?: string;         // 'mysql' (for database providers)
  displayName: string;     // 'MySQL 8.0.37' or 'MyProject (PHP 8.2)'
  running: boolean;
  pid?: number;
  port?: number;
}

interface IServiceProvider {
  readonly providerId: string;
  readonly displayName: string;
  getStatuses(): Promise<ServiceStatus[]>;
  reattachOrphans?(): Promise<void>;  // optional, for process recovery on restart
}
```

### ServiceRegistry

A `@singleton()` class registered in the DI container:

```ts
@injectable()
@singleton()
class ServiceRegistry {
  private providers = new Map<string, IServiceProvider>();

  registerProvider(provider: IServiceProvider): void;
  getAllStatuses(): Promise<ServiceStatus[]>;
  getProvider(providerId: string): IServiceProvider;

  async restoreAll(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.reattachOrphans?.();
    }
  }
}
```

### Who implements IServiceProvider

| Service | How |
|---------|-----|
| `DatabaseRegistry` | Wraps existing `listAllInstances()` into `getStatuses()`. `reattachOrphans()` scans known ports for running `mysqld.exe` processes and reattaches by PID. |
| `DevServerManager` | Implements `IServiceProvider` directly. `getStatuses()` maps to `listAll()`. `reattachOrphans()` scans known ports for running `php.exe -S` processes. |

### Orphan Reattach Strategy

On app startup, `ServiceRegistry.restoreAll()` iterates each provider's `reattachOrphans()`:

1. For each persisted instance config, check if a process is listening on the configured port (via `netstat -ano` on Windows, or a TCP connect check)
2. If a process is found, extract its PID and reattach (set `process = null` but mark `running = true` in status output — we can't re-wrap an existing PID in a `ChildProcess`, but we can display it correctly)
3. Optionally present the user with a "Reattach or kill?" dialog for each found orphan — but for Phase 2, silent reattach is sufficient

Note: On Windows, `taskkill /PID` still works for orphaned processes since we have the PID. A "Stop" action on a reattached instance sends the kill signal even though we don't own the `ChildProcess` reference.

### Registration in main.ts startup sequence

```ts
// After DI container setup, before creating window:
import { ServiceRegistry } from './services/service-registry';

const serviceRegistry = container.resolve(ServiceRegistry);

// Providers register themselves — or main.ts registers them explicitly
serviceRegistry.registerProvider(databaseRegistry);
serviceRegistry.registerProvider(devServerManager);

// Reattach orphans before showing the window
await serviceRegistry.restoreAll();
```

### What consumes ServiceRegistry

| Consumer | How |
|----------|-----|
| **System tray** | IPC handler calls `serviceRegistry.getAllStatuses()` to build tray menu with running/stopped indicators |
| **Auto-start** | Iterates `getAllStatuses()` on boot to launch services marked for auto-start |
| **Dashboard** | In addition to individual stores (PhpStatusWidget, DatabaseStatusWidget), a `ServiceOverviewWidget` can display all services in one card using the registry |

## Consequences

**Easier:**
- Adding a new service type (e.g., Caddy in Phase 4) means implementing `IServiceProvider` and one `registerProvider()` call — tray and auto-start pick it up automatically
- Orphan detection is centralized rather than duplicated per service
- The tray IPC handler has a single source of truth for service status

**Harder:**
- `reattachOrphans()` is inherently platform-specific (process listing differs across Windows/macOS/Linux). The first implementation targets Windows only via `netstat`/`tasklist`; macOS/Linux equivalents are deferred to Phase 6 alongside the platform adapters.
- Reattached processes don't have a `ChildProcess` reference, so we can't receive `exit` events. The status needs to be actively polled or checked at access time rather than event-driven.
- The `IServiceProvider` interface adds an indirection layer that every service type must implement, even if only for status reporting.

**Follow-up:**
- Create `electron/services/interfaces/IServiceRegistry.ts`
- Create `electron/services/service-registry.ts`
- `DatabaseRegistry` gains `implements IServiceProvider` + `getStatuses()` + `reattachOrphans()`
- `DevServerManager` implements `IServiceProvider` from the start
- Register both with `ServiceRegistry` in `main.ts`
- Call `serviceRegistry.restoreAll()` during startup, before `createWindow()`

## Alternatives Considered

- **No abstraction — have the tray import DatabaseRegistry and DevServerManager directly.**
  - **Rejected because:** The tray (an IPC handler or main process module) would need to know about every service type. Adding Caddy in Phase 4 means updating the tray code in addition to the Caddy service. The registry pattern means new services self-register and tray code never changes.
- **Use Node.js EventEmitter for service status changes (push model).**
  - **Rejected because:** Peer services (dev server, MySQL) are already event-aware for their own processes. The registry is a pull-model aggregator for cross-cutting consumers. Adding event emitters would duplicate the existing process lifecycle events without adding value for the consumers that only need status snapshots (tray, auto-start).
- **Make ServiceRegistry manage process lifecycle (start/stop) in addition to status.**
  - **Rejected because:** Each service has unique spawn arguments, initialization sequences, and shutdown behavior. Abstracting lifecycle management would require a generic command-builder pattern that would be more complex than the individual service implementations. The registry's job is status aggregation, not lifecycle orchestration.
