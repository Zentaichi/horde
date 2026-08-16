# ADR-0014: Scaffolder Registry (IScaffolder)

**Status:** accepted

**Date:** 2026-08-17

## Context

Phase 4 adds "project quick-create" — scaffolding a new project from a framework template (Laravel, Symfony) without leaving the app. Frameworks differ in package name, post-create commands (Symfony needs `composer require webapp`; Laravel does not), and PHP version requirements. Adding templates must be additive, exactly like adding a database engine ([ADR-0002](0002-service-layer-di-strategy.md), [ADR-0003](0003-multi-engine-database-abstraction.md)).

## Decision

Define an `IScaffolder` interface and a `ScaffolderManager` registry. Templates register by token (`IScaffolder:laravel`, `IScaffolder:symfony`), mirroring the `IDatabaseEngine:<engine>` pattern:

```ts
interface IScaffolder {
  readonly id: string;
  readonly displayName: string;
  readonly minPhpVersion: string;
  createProject(options: ScaffoldOptions, onLog?): Promise<{ path: string }>;
}
```

- **Shared base:** `ComposerScaffolder` handles PHP-binary resolution (installed → active → system PATH), composer resolution (system `composer` on PATH, else a downloaded platform-independent `composer.phar`), PHP version enforcement, target-directory conflict checks, and a background `spawn` with log streaming. Templates only declare `packageName` and optional `postCreate()`.
- **Safety:** `--no-interaction` is always passed (non-TTY); existing non-empty target directories abort; `ScaffolderManager.create()` registers the finished project via `ProjectManager.add()` so quick-create projects are immediately managed projects.
- **Registry + IPC:** `ScaffolderManager.list()`/`create()` back `scaffold:*` channels; log lines stream to the renderer on a push channel.

## Consequences

**Easier:**

- A new framework is one class (often ~5 lines) + one container registration — no IPC, store, or UI changes.
- Composer reuse avoids bundling per-platform binaries; `composer.phar` is the only download and is cross-platform.
- Scaffolding reuses the project lifecycle, so `.php-version` scanning and site mapping work on the new project immediately.

**Harder:**

- Composer must be reachable (system or downloaded); PHP must be installed — both are preconditions surfaced as clear errors.
- Framework-specific quirks (e.g. Symfony recipes) are handled in `postCreate()` per template, so the base stays generic but can't know every framework's requirements.
- Scaffolds are long-running; the UI is responsible for surfacing streamed logs and disabling concurrent creates (one at a time).

**Follow-up:**

- `ComposerScaffolder` + Laravel/Symfony templates (done, Phase 4).
- `ScaffolderManager` + `scaffold:*` IPC + quick-create dialog (done, Phase 4).

## Alternatives Considered

- **A switch statement over template names.**
  - **Rejected because:** Grows unboundedly and can't enforce the full contract per template — the same reason ADR-0003 rejected engine-specific switches.
- **Shell out to `laravel new`/`symfony new` CLIs.**
  - **Rejected because:** Those CLIs are PHP artifacts with their own install requirements (some need `laravel/installer` as a global composer package). `composer create-project` is the single lowest-common-denominator path and works for both.
