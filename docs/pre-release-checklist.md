# Pre-Release Checklist

Run through these items before cutting a release. The release process itself is documented in [docs/versioning.md](versioning.md).

## Automated gates (run on every push)

These run automatically in CI for every push to `master` and every PR. They must all pass:

- [ ] **Lint** — `npm run lint` passes with no errors (src/, electron/, tests/)
- [ ] **Typecheck** — `npm run typecheck` passes (vue-tsc for the renderer + `tsc` for the Electron main process)
- [ ] **Unit tests** — `npm run test` passes (all 24 unit tests green)
- [ ] **Build** — `npm run build` produces `release/Horde Setup <version>.exe` without errors

## Manual verification

- [ ] Launch `release/win-unpacked/Horde.exe` — app opens, dashboard renders, no blank window
- [ ] Click through each page (PHP, Databases, Projects, Dev Servers) — no crashes or blank pages
- [ ] Download and switch a PHP version; start/stop a MySQL instance; start a dev server

## E2E tests

> **Status: not wired into CI.** The Playwright suite (`npm run test:e2e`) is currently **unstable and fails locally** — the app launches with mock services, but the mock-wiring is incomplete. It does **not** gate releases or PRs. Treat it as a manual smoke check only.

- [ ] `npm run test:e2e` — run as a smoke check before release; failures are expected until the mock services are fixed

## Releasing

- [ ] Follow the process in [docs/versioning.md](versioning.md): bump `package.json`, promote `CHANGELOG.md` `[Unreleased]` to a dated section, verify locally, then push an annotated `v<version>` tag
- [ ] Pushing the tag triggers `release.yml`, which verifies the tag matches `package.json`, builds the installer, and creates a GitHub Release with the changelog section as its body
