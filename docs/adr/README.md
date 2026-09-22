# Architectural Decision Records

ADR index — one record per significant architectural decision. Add a new ADR using [template.md](template.md) when you introduce a decision; update the Status line of existing ADRs if a decision is superseded.

| ADR                                                           | Topic                                            | Status   |
| ------------------------------------------------------------- | ------------------------------------------------ | -------- |
| [0001](0001-feature-sliced-design.md)                         | Feature Sliced Design for frontend               | accepted |
| [0002](0002-service-layer-di-strategy.md)                     | Service layer & tsyringe DI                      | accepted |
| [0003](0003-multi-engine-database-abstraction.md)             | Engine-agnostic database IPC (`IDatabaseEngine`) | accepted |
| [0004](0004-platform-abstraction-boundary.md)                 | Platform abstraction (`IPlatformAdapter`)        | accepted |
| [0005](0005-download-utility-consolidation.md)                | Single canonical download utility                | accepted |
| [0006](0006-project-management-scope-boundary.md)             | Project model scope & dev server integration     | accepted |
| [0007](0007-service-registry-abstraction.md)                  | Unified process status via `ServiceRegistry`     | accepted |
| [0008](0008-settings-store-consolidation.md)                  | `SettingsStore` as canonical persistence layer   | accepted |
| [0009](0009-extension-manager-scope-boundary.md)              | Extension manager (bundled only, no PECL)        | accepted |
| [0010](0010-sqlite-migration-mechanism.md)                    | SQLite schema migrations                         | accepted |
| [0011](0011-privileged-operation-elevation.md)                | Privileged-operation elevation                   | accepted |
| [0012](0012-site-domain-management-single-source-of-truth.md) | Site/domain management & HTTPS                   | accepted |
| [0013](0013-caddy-reverse-proxy-as-managed-service.md)        | Caddy reverse proxy as a managed service         | accepted |
| [0014](0014-scaffolder-registry.md)                           | Project quick-create registry (`IScaffolder`)    | accepted |
| [0015](0015-cli-companion-architecture.md)                    | CLI companion architecture                       | accepted |
| [template](template.md)                                       | Template for new ADRs                            | —        |
