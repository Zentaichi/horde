# ADR-0005: Download Utility Consolidation

**Status:** accepted

**Date:** 2026-07-16

## Context

`PhpManager` (L177-205) and `MySqlManager` (L359-387) each contain an identical private `downloadFile()` method — 29 lines of `fetch()` + `Readable.fromWeb()` + `pipeline()` + progress reporting. A third copy exists at `electron/utils/download.ts` but is unused and contains bugs (hardcoded `\\` path separator on line 27, `require('stream')` call on line 61 instead of ES import).

Phase 2 introduces extension downloads and dev server tooling. Without consolidation, each new service that downloads files will duplicate the same stream/progress logic, reaching 4-5 identical copies.

## Decision

Fix `electron/utils/download.ts` and designate it the single canonical download utility. Remove the private `downloadFile()` methods from both `PhpManager` and `MySqlManager`, replacing them with an import of the shared utility.

The utility:

- Uses ES `import { Readable } from 'stream'` (not `require()`)
- Calls `ensureDir(dirname(destPath))` so callers don't need to pre-create directories
- Uses `DownloadProgress` from `electron/types/php.ts` as the progress callback type (already matches the `{ percent, transferredBytes, totalBytes }` shape used by all consumers)
- Is exported as a plain function — no tsyringe registration, no class, no interface

Services remain responsible for URL construction and post-download extraction. The utility handles only HTTP fetch, file write, and progress reporting.

## Consequences

**Easier:**
- Single place to fix bugs, add retry logic, or change stream handling (e.g., `AbortController` support, connection timeout)
- New services (extension manager, dev server tooling) import one function instead of copying 29 lines
- Tests can mock `fetch()` at the global level — no DI ceremony needed

**Harder:**
- Must ensure the progress callback type is compatible with all consumers (already the case — `DownloadProgress` is the shared type)
- The utility must handle `Content-Length: 0` (streaming without known size) gracefully — currently it suppresses progress events, which is correct behavior for all existing callers

**Follow-up:**
- Remove `downloadFile()` from `php-manager.ts` (L177-205)
- Remove `downloadFile()` from `mysql-manager.ts` (L359-387)
- Add `import { downloadFile } from '../utils/download'` to both files
- Delete the dead `ProgressInfo` type alias in `download.ts` (use `DownloadProgress` from `types/php.ts`)

## Alternatives Considered

- **Register `IDownloader` as an injectable service via tsyringe.**
  - **Rejected because:** `downloadFile()` is a pure I/O function with no state, no platform-dependent behavior, and no dependencies beyond Node.js built-ins. Wrapping it in a class with DI adds ceremony without benefit. Tests can mock `fetch()` directly.
- **Keep duplicated methods with a shared base class (`BaseManager extends ServiceWithDownload`).**
  - **Rejected because:** It introduces an inheritance hierarchy for what is a self-contained utility function. `PhpManager` and `MySqlManager` implement different interfaces (`IPhpManager`, `IDatabaseEngine`) and share no common superclass — introducing one for download alone over-couples them.
- **Use a third-party download library (e.g., `got`, `node-fetch`).**
  - **Rejected because:** Node.js 18+ built-in `fetch` + `Readable.fromWeb` + `pipeline` covers the entire use case with zero additional dependencies.
