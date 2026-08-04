# Contributing to Horde

Thanks for your interest in contributing. This project follows Feature Sliced Design (frontend), a service layer with DI (backend), and a platform abstraction boundary. Please read the [architecture](docs/architecture.md) and [ADR index](docs/adr/) before making architectural changes.

## Getting Started

1. Fork and clone the repository.
2. Install dependencies (this compiles native modules against Electron's ABI):
   ```bash
   npm install
   ```
3. Start the development environment:
   ```bash
   npm run dev
   ```

> Prerequisites: Node.js 24+, Python 3.9+ (`node-gyp`), and on Windows, Visual Studio Build Tools with the "Desktop development with C++" workload. See [README](README.md#prerequisites).

## Development Workflow

- Work on a branch named after the change (e.g. `feat/postgres-extension`), never directly on `master`.
- Keep commits focused and conventional (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`).
- The pre-commit hook (`husky` + `lint-staged`) runs ESLint and Prettier on staged files — make sure it passes.

## Quality Gates

Run all of these before opening a PR:

```bash
npm run lint          # ESLint (src/, electron/, tests/)
npm run typecheck     # vue-tsc (renderer) + tsc (electron main)
npm test              # Vitest unit tests
npm run build         # Production renderer + electron build (produces installer)
```

The same gates run in [CI](.github/workflows/ci.yml) on every push to `master` and every PR.

> **E2E note:** the Playwright suite (`npm run test:e2e`) is currently unstable and does not gate PRs. If you change IPC contracts or the renderer, run it locally as a smoke check and report any failures you reproduce.

## Code Conventions

- **Renderer (`src/`)** follows Feature Sliced Design layer rules, enforced by `eslint-plugin-boundaries`. Never import across feature boundaries except through `shared/`.
- **Main process (`electron/`)** implements shared interfaces (`IPhpManager`, `IDatabaseEngine`, ...) and resolves services from the tsyringe DI container.
- **Platform coupling** (paths, PATH, archives, URLs) belongs behind `IPlatformAdapter` — never branch on `process.platform` in a service.
- New database engines implement `IDatabaseEngine` and register in the DI container (`main.ts`) plus `DatabaseRegistry`.

## Testing

- **Unit:** Vitest specs under `tests/unit/`, mocking `IPlatformAdapter` and engine interfaces.
- **E2E:** Playwright specs under `tests/e2e/`, launching the built Electron app with mock services (`HORDE_E2E_TEST=1`).

## Documentation

- User-facing and architecture docs live in `docs/`.
- Architectural decisions are recorded as ADRs under `docs/adr/` — add one when you introduce a new architectural decision.
- Update `CHANGELOG.md` (under `[Unreleased]`), `docs/feature-parity.md`, and `docs/roadmap.md` when your change affects features or the roadmap.

## Submitting Changes

1. Push your branch and open a pull request against `master`.
2. Fill out the [pull request template](.github/PULL_REQUEST_TEMPLATE.md).
3. Ensure CI (lint, typecheck, unit tests, build) passes.

## Reporting Bugs & Feature Requests

Use the [issue templates](.github/ISSUE_TEMPLATE/). For security vulnerabilities, see [SECURITY.md](SECURITY.md).

## Code of Conduct

All contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).
