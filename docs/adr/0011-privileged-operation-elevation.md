# ADR-0011: Privileged-Operation Elevation Abstraction

**Status:** accepted

**Date:** 2026-08-17

## Context

Phase 4 introduces operations that exceed normal user privileges:

- Editing the hosts file (`C:\Windows\System32\drivers\etc\hosts`)
- Installing the mkcert root CA into the system trust store (`certutil`)
- Binding low ports (80/443) on macOS/Linux, where ports below 1024 are privileged

Phase 1's requirement (see [requirements.md](../requirements.md)) is that Horde **runs without administrator privileges except for optional PATH changes**. Porting these operations to macOS/Linux (Phase 6) diverges sharply: Windows needs per-operation UAC elevation; macOS/Linux need `sudo`/polkit; the underlying commands (`certutil`, `security`, `update-ca-certificates`) differ entirely.

If each service spawns its own elevated helper, the privilege logic fragments across `CaddyManager`, `MkcertManager`, and `SiteManager` and becomes un-portable.

## Decision

Elevation is a **first-class `IPlatformAdapter` concern** (extending [ADR-0004](0004-platform-abstraction-boundary.md)):

```ts
elevate(command: string, args: string[]): Promise<void>;
installCaTrust(certPath: string): Promise<void>;
canBindLowPorts(): boolean;
```

- `elevate()` runs an arbitrary command with elevated rights and resolves only when it completes, propagating non-zero exit codes as errors. Win32 implementation wraps `Start-Process -Verb RunAs -Wait -PassThru` (a UAC prompt); darwin/linux stubs are Phase 6 (`sudo`/polkit).
- `installCaTrust()` is a convenience wrapper over `elevate()` with the platform's trust-store command (`certutil -addstore -f Root` on Windows).
- `canBindLowPorts()` tells proxy logic whether 80/443 are bindable without elevation; services must fall back to high ports instead of assuming.
- Services **never** branch on `process.platform`; they call these methods and handle "elevation denied" by degrading gracefully (HTTPS off / high-port fallback), never by crashing.

## Consequences

**Easier:**

- All privilege-sensitive code lives in one file per platform, auditable in one place.
- Phase 6 ports are two new adapters, not edits across four services.
- A single `TestPlatformAdapter` stub covers every service's privilege path in unit tests.

**Harder:**

- `elevate()` is fire-and-wait; it cannot capture a long-running elevated process's stdout stream (acceptable — every Phase 4 use is a short, synchronous privileged write).
- Windows UAC prompts once per privileged operation; a persistent elevated helper is a possible future optimization but out of scope now.
- Cancelled/denied UAC surfaces as an error the caller must interpret into user-facing messaging.

**Follow-up:**

- Add the three methods to `IPlatformAdapter` (done, Slice 1).
- Implement in `Win32PlatformAdapter` (done, Slice 1).
- Defer `DarwinPlatformAdapter`/`LinuxPlatformAdapter` implementations to Phase 6.

## Alternatives Considered

- **An `ElevationService` injectable shared by services.**
  - **Rejected because:** Elevation is inherently platform-specific I/O; putting it in a service reintroduces the `process.platform` branching ADR-0004 exists to eliminate, and tests would need to mock a second abstraction layer.
- **Always run the whole app elevated.**
  - **Rejected because:** Violates the Phase 1 "no admin by default" requirement and is a poor security posture; the app should run least-privilege and escalate only for specific operations.
- **Require users to edit hosts/trust CAs manually.**
  - **Rejected because:** That would make Phase 4's core value (one-click `https://project.test`) unusable.
