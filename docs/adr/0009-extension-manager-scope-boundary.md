# ADR-0009: Extension Manager Scope Boundary (Bundled Only)

**Status:** accepted

**Date:** 2026-07-16

## Context

Phase 2 includes an "Extension manager UI" for PHP. PHP extensions exist in multiple categories:

- **Bundled** — shipped with the PHP distribution (e.g., `curl`, `mbstring`, `openssl`, `pdo_mysql`)
- **PECL** — third-party extensions requiring download, compilation, and dependency resolution (e.g., `xdebug`, `redis`, `imagick`)
- **Platform-specific** — `.dll` files on Windows, `.so` files on macOS/Linux, with different naming conventions and load mechanisms

Full PECL support is a massive feature: it requires downloading source or precompiled binaries, resolving extension dependencies (`curl` needs `openssl`), compiling on the user's machine, and handling platform-specific build toolchains. This is comparable in scope to the entire PHP version manager from Phase 1.

Without a scope boundary, Phase 2 could spend weeks on extension infrastructure that dwarfs the other six Phase 2 items combined.

## Decision

Phase 2 Extension Manager is limited to **listing and toggling bundled extensions only**. No PECL downloads, no compilation, no dependency resolution, no third-party extensions.

### Extension Data Model

```ts
// electron/types/extension.ts
interface ExtensionInfo {
  name: string;
  enabled: boolean;
  bundled: true;   // always true in Phase 2; reserved for PECL in future phases
}
```

### How It Works

1. **Listing:** For a given PHP version, run `{phpBinary} -r "echo PHP_EXTENSION_DIR;"` to find the extension directory. Read its contents for `.dll` (or `.so`) files. Strip platform-specific prefixes/suffixes (`php_`, `.dll`) to get extension names.
2. **Enabled check:** Run `{phpBinary} -r "echo php_ini_loaded_file();"` to find the active `php.ini`. Parse `extension=<name>` lines to determine enabled status.
3. **Toggle:** When the user enables/disables an extension, modify the `php.ini` file: for bundled extensions, comment or uncomment the relevant `extension=<name>` line. If the line exists but is commented (`;extension=curl`), uncomment it. If it doesn't exist, append it. If disabling, comment it out (never delete — the user may want to re-enable later).
4. **Effect:** Changes only take effect when PHP restarts. The UI shows a notice: "Restart your dev server for changes to take effect."

### IPC Contract: `extensions:*` (3 channels)

| Channel | Signature | Purpose |
|---------|-----------|---------|
| `extensions:list` | `(phpVersion: string) → ExtensionInfo[]` | List bundled extensions with enabled status |
| `extensions:enable` | `(phpVersion: string, extensionName: string) → void` | Uncomment/append `extension=<name>` in `php.ini` |
| `extensions:disable` | `(phpVersion: string, extensionName: string) → void` | Comment out `extension=<name>` in `php.ini` |

The `phpVersion` parameter is a version string like `"8.3.10"` — the handler resolves the binary path via `PhpManager`'s install directory.

### IPlatformAdapter Addition

One new method is needed to resolve extension file names per platform:

```ts
// IPlatformAdapter addition
resolveExtensionFileName(name: string): string;
```

| Platform | `resolveExtensionFileName('curl')` returns |
|----------|-------------------------------------------|
| Windows | `php_curl.dll` |
| macOS/Linux | `curl.so` (future, not implemented in Phase 2) |

### FSD Module Layout

```
src/features/extensions/
  stores/extensionStore.ts
  components/
    ExtensionList.vue         # Searchable list with enable/disable toggles
electron/services/
  interfaces/IExtensionManager.ts
  extension-manager.ts
electron/ipc/extensions.handlers.ts
electron/types/extension.ts
```

### Integration with PHP Version Selection

The extension manager operates on a **selected PHP version**. The UI presents a version selector (dropdown of installed PHP versions) at the top of the extensions page. When the user changes the selected version, the extension list reloads for that version's `php.ini` and `ext/` directory.

### What's Explicitly Out of Scope

| Deferred | Rationale |
|----------|-----------|
| PECL downloads and compilation | Requires build toolchains, dependency resolution, platform-specific binary hosting |
| Dependency resolution (`curl` → `openssl`) | PECL concern |
| Third-party extension repositories | PECL concern |
| Extension configuration editing (beyond enable/disable) | The `php.ini` editor (separate Phase 2 item) handles full ini editing |
| `php.ini` directive editing for extensions (e.g., `upload_max_filesize`) | Belongs to the `php.ini` editor, not extension manager |

## Consequences

**Easier:**
- The entire extension manager is read-directory + parse-text-file + write-text-file — no network I/O, no compilation, no dependency graph
- Native PHP commands provide all needed information (`PHP_EXTENSION_DIR`, `php_ini_loaded_file`) — no parsing of PHP source or build configs
- The IPC surface is 3 channels: list, enable, disable

**Harder:**
- Users cannot install PECL extensions from the UI. They must use `pecl install` on the command line or wait for a future phase.
- Parsing `php.ini` for `extension=` lines is fragile — the ini format has sections and conditional blocks (`[PHP]`, `[ExtensionList]`). We handle the common case (flat `extension=` lines) and gracefully skip sections. A full ini parser is overkill for enable/disable toggling.
- The `php.ini` location varies (loaded file, scanned directory). We use `php_ini_loaded_file()` and fall back to `{installDir}/php.ini` if that returns empty (common for CLI-only PHP installs on Windows).

**Follow-up:**
- Add `resolveExtensionFileName` to `IPlatformAdapter`
- Implement in `Win32PlatformAdapter`
- Create `electron/types/extension.ts`
- Create `electron/services/interfaces/IExtensionManager.ts`
- Create `electron/services/extension-manager.ts`
- Create `electron/ipc/extensions.handlers.ts`
- Add `extensions` bindings to `preload.ts` and `src/types/electron.d.ts`
- Create `src/features/extensions/` module with store and components

## Alternatives Considered

- **Include PECL in Phase 2.**
  - **Rejected because:** PECL support is a comparable scope to Phase 1's entire PHP version manager. It requires: discovering available PECL packages, downloading precompiled binaries per PHP version per platform, handling compilation fallback, resolving extension-to-PHP-version compatibility, and managing dependency chains. Bundled extensions cover 80% of the use case (enable/disable common extensions like `curl`, `pdo_mysql`, `mbstring`) with 5% of the effort.
- **Skip extension management entirely — cover it via the `php.ini` editor.**
  - **Rejected because:** The `php.ini` editor is a text editor. Users should not need to know extension file names or parse directory listings to enable `curl`. A structured toggle UI is a significantly better UX for the most common operation (enabling a bundled extension).
- **Use `php -m` to list extensions instead of reading the `ext/` directory.**
  - **Rejected because:** `php -m` lists loaded extensions, not available extensions. We need to show both enabled and disabled extensions so users can toggle them. `php -m` can confirm enabled state but cannot discover what's available to enable.
