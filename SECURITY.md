# Security Policy

## Supported Versions

Security fixes are released for the latest tagged release and, where practical, the most recent previous minor version.

| Version | Supported          |
| ------- | ------------------ |
| 0.5.x   | :white_check_mark: |
| 0.4.x   | :white_check_mark: |
| < 0.4.0 | :x:                |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.** Instead, report them privately:

- Email the maintainer at the address listed on the GitHub profile of [@Zentaichi](https://github.com/Zentaichi).
- Or, if GitHub's private vulnerability reporting is enabled for this repository, use the **Report a vulnerability** button on the Security tab.

Please include:

- Affected version(s) and platform
- Steps to reproduce
- A description of the impact
- (Optional) a suggested fix

You should receive an acknowledgement within 48 hours. If the issue is confirmed, a fix will be prepared under embargo and shipped in the next patch/minor release, at which point the vulnerability may be disclosed.

## Scope

Horde runs on the user's machine and manages local development services. Most code runs in the Electron **main** process with `nodeIntegration` disabled and `contextIsolation` enabled. The renderer never has direct Node.js access — all system interactions flow through the typed IPC surface exposed by `contextBridge`.

When assessing a report, we consider:

- IPC surface exposure (typed `databases:*`, `projects:*`, `settings:*`, etc.)
- SQLite usage (settings, instances, projects persistence)
- Command execution against user-provided paths and binaries
- Download/URL handling (releases mirror URLs)

If your research requires interactive execution against the repository, use an isolated VM or container.
