# Versioning & Releases

This document defines how Horde versions its releases and how a new release is cut.

## Semantic Versioning

Horde follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html):

- **MAJOR** (`1.0.0`) — breaking changes / first stable release
- **MINOR** (`0.X.0`) — backward-compatible new functionality
- **PATCH** (`0.0.X`) — backward-compatible bug fixes

Because Horde is pre-1.0, every milestone (a completed roadmap phase) is treated as a **MINOR** bump:

| Version | Phase / Milestone               | Date       |
| ------- | ------------------------------- | ---------- |
| 0.3.0   | Phase 1 — Core MVP              | 2026-07-14 |
| 0.4.0   | Phase 2 — Polish & Developer UX | 2026-07-24 |
| 0.5.0   | Phase 3 — Full Database Suite   | 2026-08-04 |

### Why there is no 0.1.0 or 0.2.0

The repository's early history was exploratory: the initial commit declared version `1.0.0`, which was misleading for an unreleased scaffold. Rather than cut releases that did not exist, the first **real release** was cut when Phase 1 shipped, and the version was set to `0.3.0` to align with the Phase 1 roadmap item of the same number (0.1 → 0.2 → 0.3). Releases since then have been milestone-based. No `0.1.0`/`0.2.0` tags were ever cut, and this is intentional — tags are only created for actual releases.

## Tagging Convention

- Tags are **annotated** (`git tag -a`) with a message summarizing the release.
- Tag format: `v<version>` (e.g. `v0.5.0`) — the `v` prefix is required by the [release workflow](../.github/workflows/release.yml).
- A tag is created **only** at a commit whose `package.json` version matches the tag.
- Backfilling tags for versions that were never released is discouraged.

## Release Process

1. **Bump the version** — update `version` in `package.json` (and regenerate `package-lock.json` via `npm install` if needed).
2. **Update the changelog** — promote `[Unreleased]` to a dated `[<version>]` section in `CHANGELOG.md` and open a fresh `[Unreleased]`.
3. **Update release-facing docs** — `README.md` status line, `docs/feature-parity.md`, and `docs/pre-release-checklist.md` as applicable.
4. **Commit** — `chore: bump to v<version> and update docs` (see [CONTRIBUTING.md](../CONTRIBUTING.md) for conventions).
5. **Verify locally** — `npm run lint`, `npm run typecheck`, `npm test`, and a dry `npm run build`.
6. **Tag & push** —
   ```bash
   git tag -a v<version> -m "v<version> — <summary>"
   git push origin v<version>
   ```
   Pushing the tag triggers [release.yml](../.github/workflows/release.yml), which builds the Windows installer and creates a GitHub Release. The workflow fails if the tag does not match `package.json`.

> **Note on E2E:** the Playwright suite is currently unstable and does **not** run in CI. Treat `npm run test:e2e` as a manual smoke check until it is stabilized (tracked in `docs/pre-release-checklist.md`).

## Related

- [CHANGELOG.md](../CHANGELOG.md)
- [docs/pre-release-checklist.md](pre-release-checklist.md)
- [.github/workflows/release.yml](../.github/workflows/release.yml)
