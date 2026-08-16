# ADR-0015: CLI Companion Architecture (Transport-Agnostic Command Layer)

**Status:** accepted

**Date:** 2026-08-17

## Context

Phase 4 ships a `horde` CLI companion that resolves `.php-version` for a directory (the resolver deferred by [ADR-0006](0006-project-management-scope-boundary.md)) and exposes status queries while the app runs. Two constraints shape the design:

1. **Cross-platform from day one.** The CLI must work identically on Windows, macOS, and Linux (Phase 6) without requiring the user to install Node.js.
2. **Swap-able transport.** If Electron-based startup latency becomes an issue later, the CLI must be able to move to a native binary without rewriting command logic.

## Decision

Structure the CLI as a **pure command layer decoupled from transport**:

```
electron/cli/
  commands/            # pure: args -> CliClient -> formatted output + exit code
  transports/          # CliClient implementations
  main.ts              # Electron hidden-CLI entry (no window), picks transport
```

- **`CliClient`** is the only seam commands know about (`request(command, args): Promise<unknown>`). Command files import nothing from Electron.
- **Transport (now):** HTTP to a `ControlServer` embedded in the running Horde app. The server binds `127.0.0.1` on a random port, authenticates every `POST /rpc` with a random bearer token, and publishes `{port, token}` to `~/.horde/control.json`. The CLI reads that file and fails fast with `AppNotRunningError` (exit 1, "Horde is not running") when the app is absent.
- **Runtime (now):** the CLI runs via the app's bundled Electron (`Horde.exe <cli-main.js>`), a `.cmd` shim installed through `IPlatformAdapter.installCliShim()` and placed on PATH. No external Node dependency.
- **Handlers:** `control-commands.ts` builds the RPC handler map from the DI container (`version`, `php-version`, `projects`, `sites`, `servers`), shared by the ControlServer.
- **Future swap:** replacing the HTTP transport with an in-process/pipe/native transport requires touching only `transports/` and the shim — command logic is untouched.

## Consequences

**Easier:**

- Commands are unit-testable with a fake `CliClient` (no Electron, no server).
- Security is explicit: loopback-only binding, per-launch token, JSON-only request bodies (no shell concatenation — immune to argument injection and spaces in paths).
- The deferred `.php-version` resolver (ADR-0006) is delivered: `horde php-version [path]`.

**Harder:**

- The CLI only works while the Horde app is running (a documented, script-friendly failure mode with a distinct exit code).
- Two Electron processes may be active simultaneously (app + CLI); each is a separate process and the CLI never shows a window.
- A second Electron instance adds a few hundred ms of startup — the accepted trade-off that the transport seam lets us replace later.

**Follow-up:**

- `ControlServer` + `control-commands.ts` (done, Phase 4).
- CLI command layer + HTTP transport + hidden-mode entry + PATH shim (done, Phase 4).

## Alternatives Considered

- **A standalone Node CLI requiring system Node.**
  - **Rejected because:** Adds a runtime prerequisite on the user's machine and breaks the "no prerequisites" positioning of the app.
- **Native per-platform binaries via pkg/nexe.**
  - **Rejected because:** Introduces a second build pipeline and per-OS artifacts now. The transport seam preserves this as a future option without a rewrite.
- **Unix-socket / named-pipe transport now.**
  - **Rejected because:** HTTP-on-loopback is already cross-platform and trivially testable; the seam makes a swap cheap.
