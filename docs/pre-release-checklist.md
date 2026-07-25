# Pre-Release Checklist

Run through these items before cutting a release.

## Automated gates (run on every push)

These run automatically in CI for every push to `master` and every PR. They must all pass:

- [ ] **Lint** — `npm run lint` passes with no errors
- [ ] **Typecheck** — `npm run typecheck` passes with no errors
- [ ] **Unit tests** — `npm run test` passes (all 24 tests green)
- [ ] **Build** — `npm run build` produces `release/Horde Setup <version>.exe` without errors

## Manual verification

- [ ] Launch `release/win-unpacked/Horde.exe` — app opens, dashboard renders, no blank window
- [ ] Click through each page (PHP, Databases, Projects, Dev Servers) — no crashes or blank pages

## E2E tests

E2E tests run in CI with `continue-on-error: true` (non-blocking). Run manually before release:

- [ ] `npm run test:e2e` — all 6 E2E tests pass

## Releasing

- [ ] Push a `v<version>` tag (e.g. `v0.5.0`) — the `release.yml` workflow builds and creates a GitHub Release automatically
