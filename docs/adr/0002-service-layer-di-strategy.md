# ADR-0002: Service Layer Architecture & Dependency Injection Strategy

**Status:** accepted

**Date:** 2026-06-20

## Context

The main process must manage multiple service classes (PhpManager, MySqlManager, Downloader, SettingsStore, platform adapters) that have dependencies on each other and on OS-specific implementations. Manual `new` calls in `main.ts` create tight coupling and make unit testing difficult — services cannot be replaced with mocks without modifying production code.

We need a pattern that:
1. Allows services to declare their dependencies via constructor injection.
2. Enables unit tests to swap real implementations for mocks.
3. Supports registering new engines (PostgreSQL, MariaDB) without changing startup wiring.
4. Is lightweight — no Spring-style XML, no decorator-driven magic that obscures control flow.

## Decision

Use **tsyringe** as the DI container with a **token-based registration pattern**.

**Rules:**
1. Every service exposes an interface (e.g., `IPhpManager`, `IDatabaseEngine`, `IPlatformAdapter`). The interface lives in `electron/services/interfaces/`.
2. Concrete implementations are decorated with `@injectable()` and registered in `main.ts` via `container.register(token, { useClass: Impl })`.
3. Services receive dependencies via constructor parameters decorated with `@inject(token)`.
4. IPC handlers resolve services from the container rather than receiving them as parameters. The handler file calls `container.resolve(token)`.
5. Tests import the interface and instantiate the concrete class with mock constructor arguments — no container needed in test scope.

**Container registration (conceptual `main.ts`):**

```ts
import { container } from 'tsyringe';
import { IPlatformAdapter } from './platform/IPlatformAdapter';
import { Win32PlatformAdapter } from './platform/win32';
import { IPhpManager } from './services/interfaces/IPhpManager';
import { PhpManager } from './services/php-manager';
import { IDatabaseEngine } from './services/interfaces/IDatabaseEngine';
import { MySqlManager } from './services/mysql-manager';

container.registerSingleton<IPlatformAdapter>('IPlatformAdapter', Win32PlatformAdapter);
container.registerSingleton<IPhpManager>('IPhpManager', PhpManager);
container.register<IDatabaseEngine>('IDatabaseEngine:mysql', { useClass: MySqlManager });
```

Notice `IDatabaseEngine` uses a namespaced token (`IDatabaseEngine:mysql`) so that multiple engines can coexist under the same interface. A registry function returns all registered engine tokens.

## Consequences

**Easier:**
- Unit tests mock any dependency by passing a stub to the constructor.
- Adding PostgreSQL means writing one class, decorating it, and registering it with token `IDatabaseEngine:postgresql`. Zero changes to existing services or `main.ts` beyond one new `container.register()` line.
- Platform ports (macOS, Linux) swap `Win32PlatformAdapter` for `DarwinPlatformAdapter` at startup.

**Harder:**
- tsyringe requires `reflect-metadata` import and `experimentalDecorators`/`emitDecoratorMetadata` in tsconfig. These are stable TS features but add build configuration.
- Debugging DI wiring issues requires understanding the container's resolution graph.

**Follow-up:**
- Add `tsyringe`, `reflect-metadata` to `package.json` dependencies.
- Enable `experimentalDecorators` and `emitDecoratorMetadata` in `tsconfig.node.json`.
- Refactor `PhpManager` to implement `IPhpManager` and receive `IPlatformAdapter` via constructor injection.
- Write `MySqlManager` against `IDatabaseEngine` from the start.

## Alternatives Considered

- **Manual dependency passing** (current approach — `const pm = new PhpManager(); registerPhpHandlers(pm)`).
  - **Rejected because:** Doesn't scale past 3 services. Mocking requires monkey-patching or module-level stubs. Adding PostgreSQL requires rewriting `main.ts` wiring, not just adding a line.
- **InversifyJS.**
  - **Rejected because:** Heavier API surface (more boilerplate per service) than tsyringe. tsyringe's API is a subset of InversifyJS's, which is sufficient for a single-team Electron app.
- **NestJS-style module system.**
  - **Rejected because:** NestJS couples the DI container to an HTTP framework paradigm. Horde has no HTTP server; the overhead of NestJS decorators and module files is unjustified.
