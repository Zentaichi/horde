# ADR-0013: Caddy Reverse Proxy as a Managed Service

**Status:** accepted

**Date:** 2026-08-17

## Context

Phase 4 requires a reverse proxy in front of per-project dev servers so that `http(s)://acme.test` reaches the project's `php -S` server with TLS termination. Herd-like tools run such a proxy continuously on ports 80/443.

Horde already has a service lifecycle pattern ([ADR-0007](0007-service-registry-abstraction.md)): long-running processes implement `IServiceProvider`, register with `ServiceRegistry`, and get tray status + auto-start + orphan reattach for free. Caddy must join that model rather than introduce a parallel process manager.

## Decision

Use **Caddy** as the managed reverse proxy. `CaddyManager` implements `ICaddyManager` **and** `IServiceProvider` (`providerId: "proxy"`), registered with `ServiceRegistry` in `main.ts`.

- **Binary:** downloaded per-platform via `IPlatformAdapter.getCaddyDownloadUrl()` (GitHub releases), extracted into the adapter-managed install dir; version pinned (no auto-update).
- **Config:** a Caddyfile is generated from the route table passed by [SiteManager](0012-site-domain-management-single-source-of-truth.md), written atomically to the adapter-managed proxy dir. TLS uses the wildcard `*.test` cert ([ADR-0012](0012-site-domain-management-single-source-of-truth.md)) via explicit `tls` directives on routes that have SSL enabled.
- **Reload safety:** every reload first runs `caddy validate`; if validation fails the running config is left untouched. `caddy reload` uses the admin API (enabled on `127.0.0.1:<random port>`).
- **Ports:** 80/443 by default when `IPlatformAdapter.canBindLowPorts()` allows, otherwise (and when the ports are occupied) high-port fallback (8080/8443) via `isPortOpen` probes. Resolved ports are persisted for orphan reattach.
- **Lifecycle:** `caddy run` spawned with a log ring buffer (mirrors the dev-server log pattern); stop uses `caddy stop` with a process-tree kill fallback through the platform adapter; `reattachOrphans()` probes the persisted HTTP port and re-marks the service running if a proxy is already listening.
- **Dev-server integration:** routes target `127.0.0.1:<project dev-server port>`. If the dev server is not running, Caddy serves a 502 — the UI tells users to start the project's server first.

## Consequences

**Easier:**

- Tray, auto-start, and orphan reattach cover Caddy with zero new consumer code (the registry already aggregates providers).
- Config changes are validated before apply, so a bad route can never take the proxy down.
- Adding/removing domains is a route-table recompute + reload, not a restart.

**Harder:**

- Caddy is a second large binary download on first use; failure mid-download is surfaced as a first-run setup error.
- The admin API port is random per run and persisted; if the persisted port is stale after a crash, reattach relies on the HTTP-port probe.
- No automatic Caddy version upgrades — an explicit maintenance path (like PHP/DB binaries) is a follow-up.

**Follow-up:**

- `CaddyManager` + `proxy:*` IPC (done, Phase 4).
- Caddy registered as `IServiceProvider` (done, Phase 4).
- Per-platform download URLs stubbed on macOS/Linux adapters in Phase 6.

## Alternatives Considered

- **Nginx.**
  - **Rejected because:** More config surface (server blocks, ssl directives), no native local-CA integration, and no admin API for reload — every change would require config rewrite + restart, and the config format differs across OS packages.
- **Let Caddy auto-manage its own TLS via public CA.**
  - **Rejected because:** `.test` is a reserved TLD — public CAs will not issue certificates. Local CA + explicit `tls` directives (ADR-0012) is the only reliable path.
