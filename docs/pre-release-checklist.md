# Pre-Release Checklist

Run through these items before cutting a release.

## Verify Build

- [ ] Run `npm run build` and confirm it completes without errors
- [ ] Verify `release/Horde Setup <version>.exe` is produced
- [ ] Launch `release/win-unpacked/Horde.exe` and verify the app loads without errors
- [ ] Confirm `dist-electron/**/*` is included in `electron-builder.yml` (not raw `electron/**/*`)
- [ ] Confirm `vite.config.ts` has `base: './'` set for relative asset paths
