# ADR-0001: Feature Sliced Design for Frontend

**Status:** accepted

**Date:** 2026-06-15

## Context

Horde needs a frontend architecture that scales across multiple feature modules (PHP, MySQL, later PostgreSQL, site management, etc.) without creating tight coupling. The Electron renderer is a single-page Vue 3 application that will grow from 2 feature modules (PHP, MySQL) to 6+ over multiple phases. We need conventions that allow independent development and testing of each feature while maintaining UI consistency.

## Decision

Adopt **Feature Sliced Design** (FSD) with the following layer structure and import rules:

```
src/
  app/        # Global setup, router, Pinia stores
  pages/      # Route-level components
  features/   # Self-contained feature modules (php/, mysql/, postgres/, ...)
  widgets/    # Compositions spanning multiple features/entities
  entities/   # Plain business models with no framework dependencies
  shared/     # Reusable UI kit (shadcn-vue components) and utilities
```

**Import rules:**
- `pages/` → `features/`, `widgets/`, `entities/`, `shared/`
- `features/` → `entities/`, `shared/` (never from other features)
- `widgets/` → `entities/`, `features/`
- `entities/` → nothing
- `shared/` → nothing

Each feature module is self-contained with its own API wrappers (calling `window.electronAPI`), components, and composables. Adding PostgreSQL later means creating `src/features/postgres/` without touching any existing code.

## Consequences

**Easier:**
- Adding new database engines or runtime managers is a pure-add operation.
- Features can be developed and tested in isolation.
- UI consistency is enforced by the shared layer (single source of truth for design tokens, shadcn-vue components).

**Harder:**
- Developers must understand the layer hierarchy before contributing.
- Cross-feature workflows (e.g., "show PHP info alongside MySQL status on a dashboard") must be wired through `widgets/`, not by importing across `features/`.
- E2E tests necessarily span multiple layers.

**Follow-up:**
- **Phase 2:** Enforce import rules via `eslint-plugin-boundaries`. Configured as a pre-implementation step (Step 0.4 in the Phase 2 execution plan), before any new feature modules are created, to prevent cross-feature imports from accumulating.
- Audit `features/php/` and `features/database/` to ensure no cross-feature imports exist.

## Alternatives Considered

- **Colocation by technical role** (components/, composables/, services/).
  - **Rejected because:** Causes feature code to scatter across directories. Adding PostgreSQL means touching 4+ directories instead of creating one `postgres/` folder.
- **Page-based colocation** with no shared layer.
  - **Rejected because:** Duplicates UI components and utilities. shadcn-vue components end up copied into every feature.
- **Module Federation or micro-frontends.**
  - **Rejected because:** Overkill for an Electron app with a single team. The added build complexity outweighs the isolation benefit at this scale.
